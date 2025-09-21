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
        .description('Generate a docker-compose.yaml from xq spec')
        .requiredOption('-f, --file <path>', 'Path to xq YAML spec')
        .option('-o, --out <path>', 'Output path for generated docker-compose file')
        .option('--no-gateway', 'Disable default gateway injection')
        .option('--keep-file', 'Keep generated compose file after run')
        .option('--overrides <path>', 'Path to JSON file with overrides')
        .action(async (opts) => {
            const absIn = path.resolve(process.cwd(), opts.file)
            const out = opts.out ? path.resolve(process.cwd(), opts.out) : undefined
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
                const outPath = await composeGenerator.generateCompose(absIn, out, {
                    gateway: opts.gateway,
                    keepFile: !!opts.keepFile,
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
        .description('Start services from a docker-compose file')
        .requiredOption('-f, --file <path>', 'Path to docker-compose.yaml to run')
        .option('-d, --detached', 'Run in detached mode')
        .option('--pull', 'Pull images before starting')
        .action(async (opts) => {
            const absFile = path.resolve(process.cwd(), opts.file)
            try {
                if (opts.pull) await composeInvoker.pull(absFile)
                await composeInvoker.up(absFile, { detached: !!opts.detached })
            } catch (err) {
                console.error('Failed to run up:', err.message || err)
                process.exit(3)
            }
        })

    program
        .command('down')
        .description('Stop and remove services started by the compose file')
        .requiredOption('-f, --file <path>', 'Path to docker-compose.yaml used to run')
        .action(async (opts) => {
            const absFile = path.resolve(process.cwd(), opts.file)
            try {
                await composeInvoker.down(absFile)
            } catch (err) {
                console.error('Failed to run down:', err.message || err)
                process.exit(4)
            }
        })

    await program.parseAsync(process.argv)
}

