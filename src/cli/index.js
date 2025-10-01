#!/usr/bin/env node
const { program } = require('commander')
const path = require('path')
const pkg = require('../../package.json')
const composeGenerator = require('../services/composeGenerator')
const composeInvoker = require('../services/composeInvoker')

module.exports = async function main() {
  program.name('xq-infra').description('CLI to generate docker-compose and manage test infra').version(pkg.version)

  program
    .command('generate')
    .description('Generate xq-compose.yml from xq spec')
    .requiredOption('-f, --file <path>', 'Path to xq YAML spec')
    .option('--no-gateway', 'Disable default gateway injection')
    .option('--keep-file', 'Keep generated compose file after run')
    .option('--overrides <path>', 'Path to JSON file with overrides')
    .action(async (opts) => {
      const absIn = path.resolve(process.cwd(), opts.file)
      let overrides = undefined
      if (opts.overrides) {
        try {
          overrides = require(path.resolve(process.cwd(), opts.overrides))
        } catch (e) {
          console.error('Failed to load overrides file:', e.message || e)
          process.exit(2)
        }
      }
      try {
        const outPath = await composeGenerator.generateCompose(absIn, {
          gateway: opts.gateway,
          keepFile: opts.keepFile,
          overrides
        })
        console.log('Generated docker-compose at:', outPath)
      } catch (err) {
        console.error('Failed to generate compose file:', err.message || err)
        process.exit(2)
      }
    })

  program
    .command('up')
    .description('Start services from xq-compose.yml (detached mode)')
    .option('--pull', 'Pull images before starting')
    .action(async (opts) => {
      const composeFile = path.join(process.cwd(), 'xq-compose.yml')
      try {
        if (opts.pull) await composeInvoker.pull(composeFile)
        await composeInvoker.up(composeFile, { pull: !!opts.pull })
        console.log('Services started successfully!')
      } catch (err) {
        console.error('Failed to run up:', err.message || err)
        process.exit(3)
      }
    })

  program
    .command('down')
    .description('Stop and remove services from xq-compose.yml')
    .action(async () => {
      const composeFile = path.join(process.cwd(), 'xq-compose.yml')
      try {
        await composeInvoker.down(composeFile)
        console.log('Services stopped successfully!')
      } catch (err) {
        console.error('Failed to run down:', err.message || err)
        process.exit(4)
      }
    })

  program
    .command('logs')
    .description('View logs from services in xq-compose.yml')
    .option('-f, --follow', 'Follow log output in real-time')
    .option('-t, --tail <lines>', 'Number of lines to show from the end of the logs', '100')
    .option('--timestamps', 'Show timestamps')
    .argument('[service]', 'Specific service to show logs for (optional)')
    .action(async (service, opts) => {
      const composeFile = path.join(process.cwd(), 'xq-compose.yml')
      try {
        await composeInvoker.logs(composeFile, {
          follow: !!opts.follow,
          tail: opts.tail,
          timestamps: !!opts.timestamps,
          service
        })
      } catch (err) {
        console.error('Failed to get logs:', err.message || err)
        process.exit(5)
      }
    })

  await program.parseAsync(process.argv)
}

