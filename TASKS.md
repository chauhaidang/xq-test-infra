# xq-infra Implementation Tasks

## Current Feature: Multi-File Service Configuration

### Overview
Decouple the single YAML configuration file into multiple service-specific files to improve maintainability and scalability.

**Goal**: Allow `xq-infra` CLI to scan a directory containing multiple service files and generate a single docker-compose file.

**Current State**: Single YAML file (e.g., `todo-system.yml`) contains all services + centralized dependencies

**Target State**: Each service in its own file (e.g., `postgres.service.yml`, `todo-read-service.service.yml`)

---

## Task List

### Phase 1: Core Service Loader ✅
- [x] **Task 1**: Create `src/services/serviceLoader.js` module to scan and merge service files
  - Create new module with class/functions
  - Export main API: `loadFromDirectory(dirPath)`

- [x] **Task 2**: Add directory scanning logic to find `*.service.yml` files
  - Use `fs.readdir()` to scan directory
  - Filter for `*.service.yml` and `*.service.yaml` patterns
  - Return sorted list of service files

- [x] **Task 3**: Implement service file merging into unified spec format
  - Read each service file
  - Extract service name from filename or `name` field
  - Merge all services into format: `{ services: { ... } }`
  - Preserve all service properties (image, tag, ports, environment, etc.)
  - Handle dependency resolution

- [x] **Task 4**: Add support for optional `xq.config.yml` for global settings
  - Check for `xq.config.yml` in same directory
  - Load global settings: `portRange`, `dependencies` (centralized groups)
  - Merge with service specs

**Files created:**
- `src/services/serviceLoader.js` ✅
- `tests/serviceLoader.test.js` ✅ (27 tests, all passing)

---

### Phase 2: Compose Generator Updates
- [ ] **Task 5**: Update `composeGenerator.js` to support directory input
  - Import `serviceLoader` module
  - Add logic to handle directory input in addition to file input

- [ ] **Task 6**: Modify `readXQSpec()` to detect file vs directory path
  - Use `fs.stat()` to detect if path is file or directory
  - If directory: call `serviceLoader.loadFromDirectory()`
  - If file: use existing logic (backward compatible)
  - Return unified spec format in both cases

**Files to modify:**
- `src/services/composeGenerator.js` (lines 55-62)

---

### Phase 3: CLI Integration
- [ ] **Task 7**: Update CLI to accept `-d, --dir` option for directory input
  - Add new option to `generate` command
  - Option 1: Add separate `-d, --dir <path>` flag
  - Option 2: Make `-f, --file` accept both file and directory (auto-detect)

- [ ] **Task 8**: Add auto-detection in CLI for file vs directory input
  - Detect if provided path is file or directory
  - Pass appropriate flag/info to `composeGenerator.generateCompose()`
  - Maintain backward compatibility

**Files to modify:**
- `src/cli/index.js` (lines 11-40)

---

### Phase 4: Testing
- [ ] **Task 9**: Create unit tests for `serviceLoader.js`
  - Test directory scanning
  - Test service file parsing
  - Test service merging logic
  - Test global config loading
  - Test error handling (missing files, invalid YAML, circular deps)

- [ ] **Task 10**: Update `composeGenerator.test.js` with directory-based tests
  - Add test cases for directory input
  - Test directory with multiple service files
  - Test directory with optional config file
  - Verify generated compose matches expected format

- [ ] **Task 11**: Create example service files in `examples/` directory
  - Create `examples/multi-service/` directory
  - Add example service files:
    - `postgres.service.yml`
    - `api-service.service.yml`
    - `web-service.service.yml`
    - `xq.config.yml` (optional)

- [ ] **Task 12**: Split `todo-system.yml` into individual service files for testing
  - Create `todo-app/services/` directory
  - Split into files:
    - `postgres.service.yml`
    - `todo-read-service.service.yml`
    - `todo-write-service.service.yml`
    - `xq.config.yml` (with portRange and dependencies)

- [ ] **Task 13**: Test backward compatibility with existing single-file approach
  - Run existing tests to ensure no regression
  - Test CLI with existing YAML files
  - Verify output is identical

- [ ] **Task 14**: Run integration tests with todo-app using new structure
  - Use new directory-based approach with todo-app
  - Test: `xq-infra generate -d todo-app/services`
  - Verify generated `xq-compose.yml` is correct
  - Test `xq-infra up` and `xq-infra down` work properly

**Files to create:**
- `tests/serviceLoader.test.js`
- `examples/multi-service/*.service.yml`
- `todo-app/services/*.service.yml`

**Files to modify:**
- `tests/composeGenerator.test.js`

---

### Phase 5: Documentation
- [ ] **Task 15**: Update documentation and README with new usage examples
  - Add new CLI usage examples to README
  - Document service file schema
  - Document `xq.config.yml` schema
  - Add migration guide (single file → multi-file)
  - Update examples section

**Files to modify:**
- `README.md`
- `CLAUDE.md` (add notes about new structure)

---

## Service File Schema

### Individual Service File Format
```yaml
# postgres.service.yml
name: postgres  # Optional, defaults to filename without .service.yml
image: postgres
tag: latest
environment:
  POSTGRES_DB: todoapp
  POSTGRES_USER: todouser
  POSTGRES_PASSWORD: todopass
ports:
  - "5432:5432"
volumes:
  - "./src/todo-services/database/init.sql:/docker-entrypoint-initdb.d/init.sql"
```

```yaml
# todo-read-service.service.yml
name: todo-read-service
image: todo-read-service
tag: latest
port: 3000  # Container port - host port will be auto-assigned
environment:
  DB_HOST: postgres
  DB_USER: todouser
  DB_PASSWORD: todopass
  DB_NAME: todoapp
  DB_PORT: 5432
  NODE_ENV: production
  PORT: 3000
depends_on:
  - postgres
```

### Global Config File Format
```yaml
# xq.config.yml
portRange:
  start: 3001

dependencies:
  database:
    - postgres
```

---

## CLI Usage

### Current Usage (Still Supported)
```bash
xq-infra generate -f todo-system.yml
xq-infra up
xq-infra down
```

### New Usage (Directory-based)
```bash
# Option 1: Using -d flag
xq-infra generate -d ./services

# Option 2: Auto-detect (if -f accepts directories)
xq-infra generate -f ./services

# Then use existing commands
xq-infra up
xq-infra down
```

---

## Implementation Notes

### Key Design Decisions
1. **Service name derivation**: Use filename (`postgres.service.yml` → `postgres`) or explicit `name` field
2. **File extension**: Use `.service.yml` to distinguish from other YAML files
3. **Dependency resolution**: Direct service names in each file (e.g., `depends_on: [postgres]`)
4. **Port conflicts**: Handled by existing auto-assignment logic in `composeGenerator.js`
5. **Loading order**: Alphabetical by filename
6. **Circular dependencies**: Detect and throw error during merge

### Backward Compatibility
- All existing single-file commands must continue to work
- No breaking changes to CLI interface
- Generated compose output format remains identical
- Existing tests must pass

### Benefits
- ✅ Each service isolated in own file
- ✅ Easier version control for service-specific changes
- ✅ Simpler to add/remove services
- ✅ Better organization for large systems
- ✅ Maintains all existing features (gateway, auto-port, centralized deps)

---

## Progress Tracking

**Status**: Phase 1 Complete ✅
**Started**: 2025-10-06
**Target Completion**: In Progress

### Completed Tasks
- ✅ **Phase 1** (Tasks 1-4): Core Service Loader
  - Created `src/services/serviceLoader.js` module
  - Implemented `loadFromDirectory()` API
  - Added directory scanning for `*.service.yml` and `*.service.yaml` files
  - Implemented service file merging into unified spec format
  - Added support for optional `xq.config.yml` global settings
  - Included dependency validation with circular dependency detection
  - Created comprehensive unit tests (27 tests covering all functionality)

### In Progress
None

### Blocked
None

---

## Related Files Reference

**Core Files:**
- `src/services/composeGenerator.js` - Main compose generation logic
- `src/cli/index.js` - CLI command definitions
- `src/services/gateway.js` - Gateway nginx config generation

**Test Files:**
- `tests/composeGenerator.test.js` - Existing generator tests
- `tests/integration.test.js` - Integration tests

**Example Files:**
- `examples/basic-web-app.yaml`
- `examples/microservices.yaml`
- `todo-app/todo-system.yml` - Real-world example to split

---

## Notes for Claude Code

When continuing this work in future sessions:

1. **Check progress**: Look at checkboxes above to see what's completed
2. **Start with**: "Continue from TASKS.md - implement next pending task"
3. **Update this file**: Mark tasks as completed by changing `[ ]` to `[x]`
4. **Add notes**: Add any implementation notes or issues discovered below

### Implementation Notes

**Phase 1 Implementation (2025-10-06)**
- Created `serviceLoader.js` as a singleton module (similar to other services in the project)
- Service name derivation: Prioritizes explicit `name` field, falls back to filename without `.service.yml` extension
- Error handling includes:
  - Directory existence validation
  - Empty directory check
  - YAML parsing errors with file context
  - Duplicate service name detection
  - Missing dependency detection
  - Circular dependency detection using DFS algorithm
- Global config supports both `.yml` and `.yaml` extensions
- Service files are loaded in alphabetical order for consistency
- The module returns spec format identical to current single-file format for seamless integration
- **Test Coverage**: Created `tests/serviceLoader.test.js` with 27 tests covering:
  - Directory loading and service merging (9 tests)
  - Directory scanning for `.service.yml` and `.service.yaml` files (3 tests)
  - Global config loading from `xq.config.yml` (4 tests)
  - Service file merging with global config (2 tests)
  - Service name derivation from filenames (3 tests)
  - Dependency validation including circular dependency detection (5 tests)
  - Integration scenario with complete todo-app setup (1 test)
  - All 27 tests passing ✅
