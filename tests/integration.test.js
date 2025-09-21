const fs = require('fs-extra')
const path = require('path')
const os = require('os')
const { spawn } = require('cross-spawn')
const YAML = require('yaml')

// Integration tests require Docker to be installed and running
// These tests can be skipped in CI if Docker is not available
const dockerAvailable = async () => {
    try {
        const result = await new Promise((resolve) => {
            const child = spawn('docker', ['--version'], { stdio: 'pipe' })
            child.on('exit', (code) => resolve(code === 0))
            child.on('error', () => resolve(false))
        })
        return result
    } catch {
        return false
    }
}

const runCLI = (args, options = {}) => {
    return new Promise((resolve, reject) => {
        const child = spawn('node', ['./bin/xq-infra.js', ...args], {
            stdio: 'pipe',
            cwd: process.cwd(),
            ...options
        })

        let stdout = ''
        let stderr = ''

        child.stdout.on('data', (data) => {
            stdout += data.toString()
        })

        child.stderr.on('data', (data) => {
            stderr += data.toString()
        })

        child.on('exit', (code) => {
            resolve({ code, stdout, stderr })
        })

        child.on('error', (error) => {
            reject(error)
        })
    })
}

describe('Integration Tests', () => {
    let tempDir
    let testSpecPath
    let dockerIsAvailable

    beforeAll(async () => {
        dockerIsAvailable = await dockerAvailable()
        if (!dockerIsAvailable) {
            console.warn('Docker is not available. Skipping integration tests.')
        }
    })

    beforeEach(async () => {
        tempDir = path.join(os.tmpdir(), `xq-integration-${Date.now()}`)
        await fs.ensureDir(tempDir)

        testSpecPath = path.join(tempDir, 'test-spec.yaml')
        const testSpec = {
            services: {
                'nginx-test': {
                    image: 'nginx',
                    tag: 'alpine',
                    ports: ['8080:80']
                },
                'redis-test': {
                    image: 'redis',
                    tag: 'alpine',
                    ports: ['6379:6379']
                }
            }
        }

        await fs.writeFile(testSpecPath, YAML.stringify(testSpec), 'utf8')
    })

    afterEach(async () => {
        await fs.remove(tempDir)
    })

    describe('CLI Commands', () => {
        test('should display help', async () => {
            const result = await runCLI(['--help'])

            expect(result.code).toBe(0)
            expect(result.stdout).toContain('CLI to generate docker-compose and manage test infra')
            expect(result.stdout).toContain('generate')
            expect(result.stdout).toContain('up')
            expect(result.stdout).toContain('down')
        })

        test('should display version', async () => {
            const result = await runCLI(['--version'])

            expect(result.code).toBe(0)
            expect(result.stdout).toMatch(/\d+\.\d+\.\d+/)
        })

        test('should generate docker-compose file', async () => {
            const outputPath = path.join(tempDir, 'generated-compose.yml')
            const result = await runCLI(['generate', '-f', testSpecPath, '-o', outputPath])

            expect(result.code).toBe(0)
            expect(result.stdout).toContain('Generated docker-compose at:')
            expect(await fs.pathExists(outputPath)).toBe(true)

            const composeContent = await fs.readFile(outputPath, 'utf8')
            const compose = YAML.parse(composeContent)

            expect(compose.version).toBe('3.8')
            expect(compose.services).toHaveProperty('nginx-test')
            expect(compose.services).toHaveProperty('redis-test')
            expect(compose.services).toHaveProperty('xq-gateway')
        })

        test('should generate compose without gateway', async () => {
            const outputPath = path.join(tempDir, 'no-gateway-compose.yml')
            const result = await runCLI(['generate', '-f', testSpecPath, '-o', outputPath, '--no-gateway'])

            expect(result.code).toBe(0)
            expect(await fs.pathExists(outputPath)).toBe(true)

            const composeContent = await fs.readFile(outputPath, 'utf8')
            const compose = YAML.parse(composeContent)

            expect(compose.services).not.toHaveProperty('xq-gateway')
        })

        test('should fail with invalid spec file', async () => {
            const invalidSpecPath = path.join(tempDir, 'invalid.yaml')
            await fs.writeFile(invalidSpecPath, 'invalid: yaml: content:', 'utf8')

            const result = await runCLI(['generate', '-f', invalidSpecPath])

            expect(result.code).toBe(2)
            expect(result.stderr).toContain('Failed to generate compose file')
        })

        test('should fail when spec file does not exist', async () => {
            const nonExistentPath = path.join(tempDir, 'does-not-exist.yaml')

            const result = await runCLI(['generate', '-f', nonExistentPath])

            expect(result.code).toBe(2)
            expect(result.stderr).toContain('Failed to generate compose file')
        })
    })

    describe('Docker Integration', () => {
        let composePath

        beforeEach(async () => {
            if (!dockerIsAvailable) {
                return
            }

            composePath = path.join(tempDir, 'test-compose.yml')
            const generateResult = await runCLI(['generate', '-f', testSpecPath, '-o', composePath])
            expect(generateResult.code).toBe(0)
        })

        afterEach(async () => {
            if (!dockerIsAvailable || !composePath) {
                return
            }

            // Clean up any running containers
            try {
                await runCLI(['down', '-f', composePath])
            } catch {
                // Ignore cleanup errors
            }
        })

        test('should start and stop containers', async () => {
            if (!dockerIsAvailable) {
                console.warn('Skipping Docker test - Docker not available')
                return
            }

            // Start containers in detached mode
            const upResult = await runCLI(['up', '-f', composePath, '-d'])
            expect(upResult.code).toBe(0)

            // Give containers time to start
            await new Promise(resolve => setTimeout(resolve, 2000))

            // Check that containers are running
            const psResult = await new Promise((resolve) => {
                const child = spawn('docker', ['ps', '--format', 'table {{.Names}}'], { stdio: 'pipe' })
                let stdout = ''
                child.stdout.on('data', (data) => { stdout += data.toString() })
                child.on('exit', (code) => resolve({ code, stdout }))
            })

            expect(psResult.code).toBe(0)
            expect(psResult.stdout).toMatch(/nginx-test|redis-test|xq-gateway/)

            // Stop containers
            const downResult = await runCLI(['down', '-f', composePath])
            expect(downResult.code).toBe(0)
        }, 30000) // Increase timeout for Docker operations

        test('should pull images before starting', async () => {
            if (!dockerIsAvailable) {
                console.warn('Skipping Docker test - Docker not available')
                return
            }

            const result = await runCLI(['up', '-f', composePath, '-d', '--pull'])
            expect(result.code).toBe(0)

            // Clean up
            await runCLI(['down', '-f', composePath])
        }, 60000) // Longer timeout for image pulling

        test('should handle invalid compose file for up command', async () => {
            const invalidComposePath = path.join(tempDir, 'invalid-compose.yml')

            const result = await runCLI(['up', '-f', invalidComposePath])

            expect(result.code).toBe(3)
            expect(result.stderr).toContain('Failed to run up')
        })

        test('should handle invalid compose file for down command', async () => {
            const invalidComposePath = path.join(tempDir, 'invalid-compose.yml')

            const result = await runCLI(['down', '-f', invalidComposePath])

            expect(result.code).toBe(4)
            expect(result.stderr).toContain('Failed to run down')
        })
    })

    describe('Override functionality', () => {
        test('should apply overrides from JSON file', async () => {
            const overridesPath = path.join(tempDir, 'overrides.json')
            const overrides = {
                services: {
                    'nginx-test': {
                        tag: 'latest',
                        environment: {
                            NGINX_PORT: '8080'
                        }
                    }
                }
            }

            await fs.writeFile(overridesPath, JSON.stringify(overrides, null, 2), 'utf8')

            const outputPath = path.join(tempDir, 'override-compose.yml')
            const result = await runCLI([
                'generate',
                '-f', testSpecPath,
                '-o', outputPath,
                '--overrides', overridesPath
            ])

            expect(result.code).toBe(0)

            const composeContent = await fs.readFile(outputPath, 'utf8')
            const compose = YAML.parse(composeContent)

            expect(compose.services['nginx-test'].image).toBe('nginx:latest')
            expect(compose.services['nginx-test'].environment).toEqual({
                NGINX_PORT: '8080'
            })
        })

        test('should fail with invalid overrides file', async () => {
            const invalidOverridesPath = path.join(tempDir, 'invalid-overrides.json')
            await fs.writeFile(invalidOverridesPath, 'invalid json', 'utf8')

            const result = await runCLI([
                'generate',
                '-f', testSpecPath,
                '--overrides', invalidOverridesPath
            ])

            expect(result.code).toBe(2)
            expect(result.stderr).toContain('Failed to load overrides file')
        })
    })
})