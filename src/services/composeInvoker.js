const { spawn } = require('cross-spawn')
const which = require('which')
const fs = require('fs-extra')

class ComposeInvoker {
  constructor() {
    this.dockerComposeCli = null
  }

  async detectDockerCompose() {
    if (this.dockerComposeCli) {
      return this.dockerComposeCli
    }

    // Try docker compose (v2) first, then fallback to docker-compose (v1)
    try {
      await which('docker')
      // Test if docker compose plugin is available
      const result = await this.execCommand('docker', ['compose', '--version'], { timeout: 5000 })
      if (result.exitCode === 0) {
        this.dockerComposeCli = { command: 'docker', args: ['compose'] }
        return this.dockerComposeCli
      }
    } catch (error) {
      // Docker not found or compose plugin not available
    }

    try {
      await which('docker-compose')
      this.dockerComposeCli = { command: 'docker-compose', args: [] }
      return this.dockerComposeCli
    } catch (error) {
      throw new Error('Neither "docker compose" nor "docker-compose" command found. Please install Docker with Compose plugin or docker-compose.')
    }
  }

  async up(composeFile, options = {}) {
    const { detached = true, pull = true } = options

    await this.validateComposeFile(composeFile)
    const cli = await this.detectDockerCompose()

    const args = [...cli.args, '-f', composeFile, 'up']
    if (detached) args.push('-d')
    if (pull) args.push('--pull', 'missing')
    args.push('--remove-orphans') // Always remove orphaned containers

    return this.execCommand(cli.command, args, {
      stdio: detached ? 'pipe' : 'inherit',
      cwd: process.cwd()
    })
  }

  async down(composeFile, options = {}) {
    const { removeVolumes = false, removeImages = false } = options

    await this.validateComposeFile(composeFile)
    const cli = await this.detectDockerCompose()

    const args = [...cli.args, '-f', composeFile, 'down']
    if (removeVolumes) args.push('-v')
    if (removeImages) args.push('--rmi', 'all')

    return this.execCommand(cli.command, args, {
      stdio: 'inherit',
      cwd: process.cwd()
    })
  }

  async pull(composeFile) {
    await this.validateComposeFile(composeFile)
    const cli = await this.detectDockerCompose()

    const args = [...cli.args, '-f', composeFile, 'pull']

    return this.execCommand(cli.command, args, {
      stdio: 'inherit',
      cwd: process.cwd()
    })
  }

  async logs(composeFile, options = {}) {
    const { follow = false, tail = '100', timestamps = false, service = null } = options

    await this.validateComposeFile(composeFile)
    const cli = await this.detectDockerCompose()

    const args = [...cli.args, '-f', composeFile, 'logs']
    if (follow) args.push('-f')
    if (tail) args.push('--tail', tail.toString())
    if (timestamps) args.push('--timestamps')
    if (service) args.push(service)

    return this.execCommand(cli.command, args, {
      stdio: 'inherit',
      cwd: process.cwd()
    })
  }

  async ps(composeFile) {
    await this.validateComposeFile(composeFile)
    const cli = await this.detectDockerCompose()

    const args = [...cli.args, '-f', composeFile, 'ps']

    return this.execCommand(cli.command, args, {
      stdio: 'inherit',
      cwd: process.cwd()
    })
  }

  async validateComposeFile(composeFile) {
    try {
      await fs.access(composeFile)
    } catch (error) {
      throw new Error(`Docker compose file not found: ${composeFile}`)
    }
  }

  execCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const { timeout = 300000, ...spawnOptions } = options // 5 minute default timeout

      const child = spawn(command, args, spawnOptions)
      let timeoutId

      if (timeout) {
        timeoutId = setTimeout(() => {
          child.kill('SIGTERM')
          reject(new Error(`Command timed out after ${timeout}ms`))
        }, timeout)
      }

      let stdout = ''
      let stderr = ''

      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data.toString()
        })
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data.toString()
        })
      }

      child.on('error', (error) => {
        if (timeoutId) clearTimeout(timeoutId)
        reject(error)
      })

      child.on('exit', (exitCode, signal) => {
        if (timeoutId) clearTimeout(timeoutId)

        const result = {
          exitCode,
          signal,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        }

        if (exitCode === 0) {
          resolve(result)
        } else {
          const errorMsg = `Command failed with exit code ${exitCode}: ${command} ${args.join(' ')}`
          const fullError = stderr || stdout || 'No error output'
          const error = new Error(`${errorMsg}\n\nDocker output:\n${fullError}`)
          error.result = result
          reject(error)
        }
      })

      // Handle process signals
      process.on('SIGINT', () => {
        child.kill('SIGINT')
      })

      process.on('SIGTERM', () => {
        child.kill('SIGTERM')
      })
    })
  }
}

module.exports = new ComposeInvoker()