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

### Phase 2: Compose Generator Updates ✅
- [x] **Task 5**: Update `composeGenerator.js` to support directory input
  - Import `serviceLoader` module
  - Add logic to handle directory input in addition to file input

- [x] **Task 6**: Modify `readXQSpec()` to detect file vs directory path
  - Use `fs.stat()` to detect if path is file or directory
  - If directory: call `serviceLoader.loadFromDirectory()`
  - If file: use existing logic (backward compatible)
  - Return unified spec format in both cases

**Files modified:**
- `src/services/composeGenerator.js` ✅ (added serviceLoader import, updated readXQSpec method)
- `tests/composeGenerator.test.js` ✅ (added 4 new tests for directory support)

---

### Phase 3: CLI Integration ✅
- [x] **Task 7**: Update CLI to accept directory input
  - Updated `-f, --file` option to accept both file and directory (auto-detect approach)
  - Updated option description to reflect directory support

- [x] **Task 8**: Add auto-detection in CLI for file vs directory input
  - Auto-detection handled by `composeGenerator.readXQSpec()` method
  - No changes needed in CLI action handler (works transparently)
  - Backward compatibility confirmed with existing file inputs

**Files modified:**
- `src/cli/index.js` ✅ (updated generate command description)

**Example files created:**
- `examples/multi-service/postgres.service.yml` ✅
- `examples/multi-service/api-service.service.yml` ✅
- `examples/multi-service/web-service.service.yml` ✅
- `examples/multi-service/xq.config.yml` ✅

---

### Phase 4: Testing
- [ ] **Task 9**: Create unit tests for `serviceLoader.js`
  - Test directory scanning
  - Test service file parsing
  - Test service merging logic
  - Test global config loading
  - Test error handling (missing files, invalid YAML, circular deps)

- [x] **Task 10**: Update `composeGenerator.test.js` with directory-based tests
  - Add test cases for directory input
  - Test directory with multiple service files
  - Test directory with optional config file
  - Verify generated compose matches expected format

- [x] **Task 11**: Create example service files in `examples/` directory
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

- [x] **Task 13**: Test backward compatibility with existing single-file approach
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

### Phase 5: Documentation ✅
- [x] **Task 15**: Update documentation and README with new usage examples
  - Add new CLI usage examples to README
  - Document service file schema
  - Document `xq.config.yml` schema
  - Add migration guide (single file → multi-file)
  - Update examples section

**Files modified:**
- `README.md` ✅ (added comprehensive multi-file configuration documentation)

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

**Status**: Phase 5 Complete ✅
**Started**: 2025-10-06
**Last Updated**: 2025-10-07

### Completed Tasks
- ✅ **Phase 1** (Tasks 1-4): Core Service Loader
  - Created `src/services/serviceLoader.js` module
  - Implemented `loadFromDirectory()` API
  - Added directory scanning for `*.service.yml` and `*.service.yaml` files
  - Implemented service file merging into unified spec format
  - Added support for optional `xq.config.yml` global settings
  - Included dependency validation with circular dependency detection
  - Created comprehensive unit tests (27 tests covering all functionality)

- ✅ **Phase 2** (Tasks 5-6, 10): Compose Generator Updates
  - Updated `composeGenerator.js` to support directory input
  - Imported `serviceLoader` module
  - Modified `readXQSpec()` to detect file vs directory using `fs.stat()`
  - Added directory loading via `serviceLoader.loadFromDirectory()`
  - Maintained backward compatibility with single-file input
  - Added 4 comprehensive tests for directory support
  - All 74 tests passing (16 composeGenerator tests + 27 serviceLoader tests + others)

- ✅ **Phase 3** (Tasks 7-8, 11, 13): CLI Integration
  - Updated `src/cli/index.js` to accept both files and directories
  - Modified `-f, --file` option description to indicate directory support
  - Auto-detection handled transparently by `composeGenerator.readXQSpec()`
  - Created example multi-service directory in `examples/multi-service/`
  - Tested CLI with both directory and file inputs
  - Confirmed backward compatibility with existing YAML files
  - All 74 tests continue to pass

- ✅ **Phase 5** (Task 15): Documentation
  - Added comprehensive "Multi-File Service Configuration" section to README
  - Updated CLI usage examples with directory support
  - Documented service file schema and naming conventions
  - Documented global `xq.config.yml` configuration file
  - Added complete migration guide (single-file → multi-file)
  - Added Example 4 showing multi-file service organization
  - Updated features list and table of contents

### Remaining Tasks
- Phase 4, Task 12: Split `todo-system.yml` into individual service files (optional)
- Phase 4, Task 14: Run integration tests with todo-app using new structure (optional)

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

**Phase 5 Implementation (2025-10-07)**
- Updated `README.md` with comprehensive multi-file configuration documentation
- Added new section "Multi-File Service Configuration" with:
  - Directory structure overview
  - Service file format examples
  - Global configuration file (`xq.config.yml`) documentation
  - Usage instructions and benefits
  - File naming conventions
  - Complete working example reference
- Updated "Generate Command" section with directory support in options
- Added Example 4: Multi-File Service Organization showing real-world usage
- Added complete "Migration Guide" section with:
  - Step-by-step migration instructions
  - Before/after code examples
  - Benefits of migration
  - Backward compatibility notes
- Updated "Features" list to include "Multi-File Configuration"
- Updated Table of Contents with new sections
- Documentation is now complete and ready for users

**Phase 3 Implementation (2025-10-07)**
- Updated CLI `generate` command option description in `src/cli/index.js`
- Changed `-f, --file` description to: "Path to xq YAML spec file or directory containing *.service.yml files"
- No logic changes needed in CLI handler - auto-detection works transparently through `composeGenerator.readXQSpec()`
- Created comprehensive example directory `examples/multi-service/` with:
  - `postgres.service.yml` - Database service
  - `api-service.service.yml` - Node.js API service with DB dependency
  - `web-service.service.yml` - Nginx web service with API dependency
  - `xq.config.yml` - Global config with portRange and centralized dependencies
- CLI testing results:
  - ✅ Directory input: `node bin/xq-infra.js generate -f examples/multi-service` - Success
  - ✅ File input: `node bin/xq-infra.js generate -f examples/basic-web-app.yaml` - Success (backward compatible)
  - ✅ Help text: `node bin/xq-infra.js generate --help` - Shows updated description
- All 74 tests continue to pass with no regressions

**Phase 2 Implementation (2025-10-07)**
- Updated `composeGenerator.readXQSpec()` to support both file and directory inputs
- Added path existence validation and type detection using `fs.stat()`
- Directory paths automatically route through `serviceLoader.loadFromDirectory()`
- File paths continue to use existing YAML file parsing (backward compatible)
- Enhanced error messages to provide clear feedback on path issues
- Added 4 new test cases:
  1. `should read and parse spec from directory` - Basic directory loading
  2. `should read directory with global config` - Directory with xq.config.yml
  3. `should generate compose from directory with multiple services` - End-to-end compose generation from directory
  4. `should generate compose from directory with global config` - Complete integration with centralized dependencies and port ranges
- All existing tests continue to pass, confirming backward compatibility
- Test coverage for `composeGenerator.js` increased to 91.81% statements

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
