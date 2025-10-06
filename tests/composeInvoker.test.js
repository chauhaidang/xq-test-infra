const fs = require('fs-extra')
const path = require('path')
const os = require('os')
const composeInvoker = require('../src/services/composeInvoker')

// Mock cross-spawn
jest.mock('cross-spawn')
const { spawn } = require('cross-spawn')

// Mock which
jest.mock('which')
const which = require('which')

describe('ComposeInvoker', () => {
  let tempDir
  let testComposePath

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `xq-test-${Date.now()}`)
    await fs.ensureDir(tempDir)

    testComposePath = path.join(tempDir, 'docker-compose.yml')
    await fs.writeFile(testComposePath, `
version: '3.8'
services:
  test-service:
    image: nginx:alpine
    ports:
      - "8080:80"
`, 'utf8')

    // Reset mocks
    jest.clearAllMocks()
    composeInvoker.dockerComposeCli = null
  })

  afterEach(async () => {
    await fs.remove(tempDir)
  })

  describe('detectDockerCompose', () => {
    test('should detect docker compose v2 first', async () => {
      which.mockImplementation(async (cmd) => {
        if (cmd === 'docker') return '/usr/bin/docker'
        throw new Error('Command not found')
      })

      const mockChild = {
        on: jest.fn((event, callback) => {
          if (event === 'exit') {
            setTimeout(() => callback(0), 10)
          }
        })
      }
      spawn.mockReturnValue(mockChild)

      const cli = await composeInvoker.detectDockerCompose()

      expect(cli).toEqual({
        command: 'docker',
        args: ['compose']
      })
      expect(spawn).toHaveBeenCalledWith('docker', ['compose', '--version'], {})
    })

    test('should fallback to docker-compose v1', async () => {
      which.mockImplementation(async (cmd) => {
        if (cmd === 'docker') throw new Error('Command not found')
        if (cmd === 'docker-compose') return '/usr/bin/docker-compose'
        throw new Error('Command not found')
      })

      const cli = await composeInvoker.detectDockerCompose()

      expect(cli).toEqual({
        command: 'docker-compose',
        args: []
      })
    })

    test('should throw error when neither command is available', async () => {
      which.mockImplementation(async () => {
        throw new Error('Command not found')
      })

      await expect(composeInvoker.detectDockerCompose())
        .rejects.toThrow('Neither "docker compose" nor "docker-compose" command found')
    })

    test('should cache detection result', async () => {
      which.mockImplementation(async (cmd) => {
        if (cmd === 'docker-compose') return '/usr/bin/docker-compose'
        throw new Error('Command not found')
      })

      // First call
      await composeInvoker.detectDockerCompose()

      // Second call should use cached result
      const cli = await composeInvoker.detectDockerCompose()

      expect(cli).toEqual({
        command: 'docker-compose',
        args: []
      })
      expect(which).toHaveBeenCalledTimes(2) // Only called once for each command
    })
  })

  describe('validateComposeFile', () => {
    test('should pass for existing file', async () => {
      await expect(composeInvoker.validateComposeFile(testComposePath))
        .resolves.toBeUndefined()
    })

    test('should throw error for non-existent file', async () => {
      const nonExistentPath = path.join(tempDir, 'non-existent.yml')

      await expect(composeInvoker.validateComposeFile(nonExistentPath))
        .rejects.toThrow('Docker compose file not found')
    })
  })

  describe('execCommand', () => {
    test('should resolve on successful command execution', async () => {
      const mockChild = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              setTimeout(() => callback(Buffer.from('success output')), 10)
            }
          })
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn((event, callback) => {
          if (event === 'exit') {
            setTimeout(() => callback(0, null), 20)
          }
        }),
        kill: jest.fn()
      }
      spawn.mockReturnValue(mockChild)

      const result = await composeInvoker.execCommand('echo', ['test'])

      expect(result).toEqual({
        exitCode: 0,
        signal: null,
        stdout: 'success output',
        stderr: ''
      })
    })

    test('should reject on command failure', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              setTimeout(() => callback(Buffer.from('error output')), 10)
            }
          })
        },
        on: jest.fn((event, callback) => {
          if (event === 'exit') {
            setTimeout(() => callback(1, null), 20)
          }
        }),
        kill: jest.fn()
      }
      spawn.mockReturnValue(mockChild)

      await expect(composeInvoker.execCommand('false', []))
        .rejects.toThrow('Command failed with exit code 1')
    })

    test('should handle timeout', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(), // Never calls exit
        kill: jest.fn()
      }
      spawn.mockReturnValue(mockChild)

      await expect(composeInvoker.execCommand('sleep', ['10'], { timeout: 100 }))
        .rejects.toThrow('Command timed out after 100ms')

      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM')
    })

    test('should handle spawn errors', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Spawn failed')), 10)
          }
        }),
        kill: jest.fn()
      }
      spawn.mockReturnValue(mockChild)

      await expect(composeInvoker.execCommand('invalid-command', []))
        .rejects.toThrow('Spawn failed')
    })
  })

  describe('up', () => {
    beforeEach(() => {
      composeInvoker.dockerComposeCli = { command: 'docker', args: ['compose'] }
    })

    test('should call docker compose up with correct arguments', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'exit') {
            setTimeout(() => callback(0, null), 10)
          }
        }),
        kill: jest.fn()
      }
      spawn.mockReturnValue(mockChild)

      await composeInvoker.up(testComposePath)

      expect(spawn).toHaveBeenCalledWith('docker',
        ['compose', '-f', testComposePath, 'up', '-d', '--remove-orphans'],
        expect.objectContaining({
          stdio: 'pipe',
          cwd: process.cwd()
        })
      )
    })

    test('should add detached flag when specified', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'exit') {
            setTimeout(() => callback(0, null), 10)
          }
        }),
        kill: jest.fn()
      }
      spawn.mockReturnValue(mockChild)

      await composeInvoker.up(testComposePath, { detached: true })

      expect(spawn).toHaveBeenCalledWith('docker',
        ['compose', '-f', testComposePath, 'up', '-d', '--remove-orphans'],
        expect.objectContaining({
          stdio: 'pipe'
        })
      )
    })

    test('should add pull flag when specified', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'exit') {
            setTimeout(() => callback(0, null), 10)
          }
        }),
        kill: jest.fn()
      }
      spawn.mockReturnValue(mockChild)

      await composeInvoker.up(testComposePath, { pull: true })

      expect(spawn).toHaveBeenCalledWith('docker',
        ['compose', '-f', testComposePath, 'up', '-d', '--pull', 'always', '--remove-orphans'],
        expect.any(Object)
      )
    })
  })

  describe('down', () => {
    beforeEach(() => {
      composeInvoker.dockerComposeCli = { command: 'docker-compose', args: [] }
    })

    test('should call docker-compose down with correct arguments', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'exit') {
            setTimeout(() => callback(0, null), 10)
          }
        }),
        kill: jest.fn()
      }
      spawn.mockReturnValue(mockChild)

      await composeInvoker.down(testComposePath)

      expect(spawn).toHaveBeenCalledWith('docker-compose',
        ['-f', testComposePath, 'down'],
        expect.objectContaining({
          stdio: 'inherit',
          cwd: process.cwd()
        })
      )
    })

    test('should add volume removal flag when specified', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'exit') {
            setTimeout(() => callback(0, null), 10)
          }
        }),
        kill: jest.fn()
      }
      spawn.mockReturnValue(mockChild)

      await composeInvoker.down(testComposePath, { removeVolumes: true })

      expect(spawn).toHaveBeenCalledWith('docker-compose',
        ['-f', testComposePath, 'down', '-v'],
        expect.any(Object)
      )
    })
  })

  describe('pull', () => {
    beforeEach(() => {
      composeInvoker.dockerComposeCli = { command: 'docker', args: ['compose'] }
    })

    test('should call docker compose pull', async () => {
      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'exit') {
            setTimeout(() => callback(0, null), 10)
          }
        }),
        kill: jest.fn()
      }
      spawn.mockReturnValue(mockChild)

      await composeInvoker.pull(testComposePath)

      expect(spawn).toHaveBeenCalledWith('docker',
        ['compose', '-f', testComposePath, 'pull'],
        expect.any(Object)
      )
    })
  })
})