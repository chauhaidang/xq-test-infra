const fs = require('fs-extra')
const path = require('path')
const os = require('os')
const { v4: uuidv4 } = require('uuid')
const YAML = require('yaml')
const gateway = require('./gateway')

class ComposeGenerator {
    constructor() {
        this.tempFiles = new Set()
        this.setupCleanup()
    }

    setupCleanup() {
        // Avoid multiple listeners in tests
        if (!this.listenersSetup) {
            process.setMaxListeners(20) // Increase limit for tests
            process.on('exit', () => this.cleanupTempFiles())
            process.on('SIGINT', () => this.cleanupTempFiles())
            process.on('SIGTERM', () => this.cleanupTempFiles())
            this.listenersSetup = true
        }
    }

    async generateCompose(specPath, options = {}) {
        const {
            gateway: enableGateway = true,
            keepFile = true,
            overrides = {}
        } = options

        // Read and parse XQ spec
        const spec = await this.readXQSpec(specPath)

        // Apply overrides
        const mergedSpec = this.applyOverrides(spec, overrides)

        // Generate compose object
        const compose = await this.generateComposeObject(mergedSpec, enableGateway, keepFile)

        // Always output to xq-compose.yml in current directory
        const finalOutputPath = path.join(process.cwd(), 'xq-compose.yml')

        // Write compose file
        await fs.outputFile(finalOutputPath, YAML.stringify(compose), 'utf8')

        // Track temp file for cleanup only if not keeping files
        if (!keepFile) {
            this.tempFiles.add(finalOutputPath)
        }

        return finalOutputPath
    }

    async readXQSpec(specPath) {
        try {
            const content = await fs.readFile(specPath, 'utf8')
            return YAML.parse(content)
        } catch (error) {
            throw new Error(`Failed to read XQ spec from ${specPath}: ${error.message}`)
        }
    }

    applyOverrides(spec, overrides) {
        // Deep merge overrides with spec
        const merged = JSON.parse(JSON.stringify(spec))

        if (overrides.services) {
            Object.keys(overrides.services).forEach(serviceName => {
                if (merged.services && merged.services[serviceName]) {
                    Object.assign(merged.services[serviceName], overrides.services[serviceName])
                }
            })
        }

        return merged
    }

    async generateComposeObject(spec, enableGateway, keepFile = false) {
        const compose = {
            version: '3.8',
            services: {},
            networks: {
                'xq-network': {
                    driver: 'bridge'
                }
            }
        }

        // Add services from spec
        if (spec.services) {
            Object.entries(spec.services).forEach(([name, service]) => {
                compose.services[name] = this.convertServiceToCompose(service)
            })
        }

        // Add gateway if enabled
        if (enableGateway && Object.keys(compose.services).length > 0) {
            await this.addGateway(compose, keepFile)
        }

        return compose
    }

    convertServiceToCompose(service) {
        const composeService = {
            image: `${service.image}:${service.tag || 'latest'}`,
            networks: ['xq-network']
        }

        // Add optional configurations
        if (service.ports) {
            composeService.ports = service.ports
        }

        if (service.environment) {
            composeService.environment = service.environment
        }

        if (service.volumes) {
            composeService.volumes = service.volumes
        }

        if (service.command) {
            composeService.command = service.command
        }

        if (service.depends_on) {
            composeService.depends_on = service.depends_on
        }

        return composeService
    }

    async addGateway(compose, keepFile = false) {
        // Generate nginx config in project directory
        const nginxConfigPath = path.join(process.cwd(), 'nginx-gateway.conf')
        await gateway.generateNginxConfig(compose.services, nginxConfigPath)

        // Add to temp files for cleanup only if not keeping files
        if (!keepFile) {
            this.tempFiles.add(nginxConfigPath)
        }

        // Find an available port for gateway (avoid conflicts)
        const usedPorts = new Set()
        Object.values(compose.services).forEach(service => {
            if (service.ports) {
                service.ports.forEach(port => {
                    const hostPort = port.split(':')[0]
                    usedPorts.add(parseInt(hostPort))
                })
            }
        })

        // Find next available port starting from 8080
        let gatewayPort = 8080
        while (usedPorts.has(gatewayPort)) {
            gatewayPort++
        }

        // Add gateway service
        compose.services['xq-gateway'] = {
            image: 'nginx:alpine',
            ports: [`${gatewayPort}:80`],
            volumes: [`${nginxConfigPath}:/etc/nginx/nginx.conf:ro`],
            networks: ['xq-network'],
            depends_on: Object.keys(compose.services)
        }
    }

    createTempPath(prefix, suffix) {
        const tempDir = os.tmpdir()
        const filename = `${prefix}-${uuidv4()}${suffix}`
        return path.join(tempDir, filename)
    }

    cleanupTempFiles() {
        this.tempFiles.forEach(file => {
            try {
                fs.removeSync(file)
            } catch (error) {
                // Ignore cleanup errors
            }
        })
        this.tempFiles.clear()
    }
}

module.exports = new ComposeGenerator()