# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm test` - Run Jest tests
- `npm run build` - Validate JS syntax and run tests
- `npm run lint` - ESLint check
- `npm run lint:fix` - ESLint auto-fix

### CLI Usage
- `npm start` or `./bin/xq-infra.js` - Run CLI
- `xq-infra generate -f <yaml>` - Generate docker-compose from spec
- `xq-infra up -f <compose>` - Start containers
- `xq-infra down -f <compose>` - Stop containers

### Docker Build (todo-app)
- `./build-read-service.sh` - Build read service image
- `./build-write-service.sh` - Build write service image
- `./build-all-services.sh` - Build both services
- Context path: `src/todo-services/` (relative to todo-app directory)

## Architecture

**CLI Flow**: `bin/xq-infra.js` → `src/cli/index.js` (Commander.js) → Service layer

**Core Services**:
- `composeGenerator.js` - ✅ Converts YAML specs to docker-compose with gateway support
- `composeInvoker.js` - ✅ Executes docker-compose commands with auto-detection
- `gateway.js` - ✅ Generates nginx proxy config for service routing
- `registryAuth.js` - ✅ Docker registry login functionality

**Key Dependencies**:
- `@chauhaidang/xq-js-common-kit` (v1.0.3) - Internal utilities
- `commander` (v11.0.0) - CLI framework
- `fs-extra` (v11.1.1) - Enhanced file system operations
- `yaml` (v2.3.1) - YAML parsing and serialization
- `cross-spawn` (v7.0.6) - Cross-platform process spawning
- `uuid` (v9.0.0) - UUID generation for temp files
- `which` (v2.0.2) - Command detection utility

**Current State**: Version 0.0.2 on `main` branch. Core services fully implemented:
- `composeGenerator.js` - ✅ Complete: Converts YAML specs to docker-compose with gateway support
- `composeInvoker.js` - ✅ Complete: Executes docker-compose commands with auto-detection
- `gateway.js` - ✅ Complete: Generates nginx proxy config for service routing
- `registryAuth.js` - ✅ Complete: Docker registry login functionality

### Notes
- When running tests in any e2e folder, you need to use docker-compose to spin up all containers before run test.
- This project has 2 components: todo-app (in todo-app directory) is an application used for testing the xq-infra (in src directory)
- For information of cli: read [this](./README.md) for comprehensive usage guide
- For information of todo-app: read [this](./todo-app/README.md) 

### Agents:
- Use agent `nodejs-quality-engineer`