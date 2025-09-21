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

## Architecture

**CLI Flow**: `bin/xq-infra.js` → `src/cli/index.js` (Commander.js) → Service layer

**Core Services**:
- `composeGenerator.js` - Converts YAML specs to docker-compose (empty, needs implementation)
- `composeInvoker.js` - Executes docker-compose commands (empty, needs implementation)
- `gateway.js` - Generates nginx proxy config for service routing
- `registryAuth.js` - Docker registry login

**Key Dependencies**:
- `@chauhaidang/xq-js-common-kit` - Internal utilities
- `commander` - CLI framework
- `fs-extra`, `yaml`, `cross-spawn`

**Current State**: Active development on `001-as-a-nodejs` branch. Core generator/invoker services need implementation per spec in `specs/001-as-a-nodejs/spec.md`.


**Coding standard**
- Follow .eslintrc.json rules
- Follow best practices of javascript development
- Use most suitable javascript design pattern