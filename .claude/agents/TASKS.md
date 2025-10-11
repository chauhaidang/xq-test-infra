# xq-infra Implementation Tasks

---

## Current Feature: GitHub Actions E2E Testing Workflow

### Overview
Implement comprehensive GitHub Actions workflow to automate E2E testing of todo-app using xq-infra CLI.

**Goal**: Automate the entire test lifecycle - build Docker images, deploy with xq-infra, run E2E tests, and cleanup.

**Current State**: Basic CI workflow exists (`.github/workflows/ci.yml`) that only tests the CLI tool (unit tests, linting)

**Target State**: Complete E2E workflow that validates both xq-infra CLI and todo-app example in real-world usage

---

## Task List

### Phase 1: Helper Scripts
Create supporting scripts needed by the workflow.

- [x] **Task 1**: Create wait-for-services health check script
  - Create `todo-app/e2e-tests/setup/wait-for-services.sh`
  - Implement timeout-based health check polling for gateway endpoint
  - Check gateway at `http://localhost:8080` (or configured port)
  - Verify services are accessible through gateway intelligent routing
  - Add clear console output for debugging
  - Make script executable (`chmod +x`)
  - Test script locally with xq-infra

**Files to create:**
- `todo-app/e2e-tests/setup/wait-for-services.sh`

**Note**: E2E tests and build scripts are already properly configured:
- Tests use single `GATEWAY_URL` (default: http://localhost:8080) via `utils/http-clients.js`
- Gateway handles intelligent routing to read/write services based on HTTP methods
- Database connection already uses environment variables with fallback defaults in `setup/db-connection.js`
- Build scripts already support CI with `GITHUB_TOKEN` environment variable
- Dockerfiles use secure multi-stage builds

---

### Phase 2: E2E Workflow Implementation
Create the main GitHub Actions workflow file.

- [x] **Task 2**: Create E2E workflow file structure
  - Create `.github/workflows/e2e-tests.yml`
  - Define workflow trigger conditions:
    - Push to `main` branch
    - Pull requests to `main` branch
    - Path filters for relevant changes
  - Set workflow-level environment variables
  - Define timeout (20 minutes recommended)

- [x] **Task 3**: Implement "Setup" job steps
  - Add checkout step with `actions/checkout@v4`
  - Add Node.js setup with `actions/setup-node@v4` (Node 20)
  - Configure npm caching
  - Install xq-infra CLI dependencies (`npm ci`)
  - Add step to verify xq-infra installation

- [x] **Task 4**: Implement "Build Docker Images" job steps
  - Setup Docker Buildx with `docker/setup-buildx-action@v3`
  - Configure Docker layer caching
  - Build todo-app services using build scripts
  - Pass `GITHUB_TOKEN` securely to build process
  - Verify images are built successfully
  - Optional: Add image scanning step

- [x] **Task 5**: Implement "Deploy Test Environment" job steps
  - Generate docker-compose using xq-infra:
    - `./bin/xq-infra.js generate -f todo-app/services`
  - Display generated compose file for debugging
  - Start services with xq-infra:
    - `./bin/xq-infra.js up`
  - Wait for services to be ready using wait script
  - Verify all containers are running

- [x] **Task 6**: Implement "Run E2E Tests" job steps
  - Set environment variables for E2E tests
  - Install E2E test dependencies (`npm ci` in `todo-app/e2e-tests/`)
  - Run E2E test suite (`npm test`)
  - Generate test reports
  - Upload test results as artifacts

- [x] **Task 7**: Implement "Cleanup and Logging" job steps
  - Add step to capture logs on failure:
    - `./bin/xq-infra.js logs`
  - Upload logs as artifacts (on failure)
  - Add cleanup step (always runs):
    - `./bin/xq-infra.js down`
  - Verify all containers are stopped
  - Optional: Clean up Docker images/volumes

**Files to create:**
- `.github/workflows/e2e-tests.yml`

---

### Phase 3: CI Workflow Update
Update existing CI workflow and add badges.

- [ ] **Task 8**: Review and update existing CI workflow
  - Review `.github/workflows/ci.yml`
  - Ensure it focuses on CLI tool unit tests only
  - Keep it fast (< 3 minutes)
  - Add clear job names and descriptions
  - Test that both workflows don't conflict

- [ ] **Task 9**: Add workflow badges to README
  - Add E2E Tests badge to README
  - Update existing CI badge if needed
  - Position badges prominently at top of README
  - Verify badges work correctly (may need to merge first)

**Files to modify:**
- `.github/workflows/ci.yml` (review/update)
- `README.md` (add badges)

---

### Phase 4: Testing & Validation
Test the workflow locally and verify it works in GitHub Actions.

- [ ] **Task 10**: Test workflow locally with act (optional)
  - Install `act` tool for local GitHub Actions testing
  - Run workflow locally: `act push`
  - Debug any issues that arise
  - Verify all steps complete successfully
  - Note: Some features may not work identically to GitHub

- [ ] **Task 11**: Test workflow in GitHub Actions
  - Create feature branch
  - Push branch to GitHub
  - Verify workflow triggers correctly
  - Monitor workflow execution
  - Check all jobs complete successfully
  - Review uploaded artifacts
  - Verify logs are captured correctly

- [ ] **Task 12**: Test failure scenarios
  - Intentionally break a test to verify failure handling
  - Confirm logs are captured and uploaded
  - Verify cleanup runs even on failure
  - Test workflow cancellation handling
  - Restore tests after verification

**Testing checklist:**
- [ ] Workflow triggers on push to main
- [ ] Workflow triggers on pull request
- [ ] Docker images build successfully
- [ ] xq-infra generates compose correctly
- [ ] Services start and become healthy
- [ ] E2E tests execute and pass
- [ ] Logs captured on failure
- [ ] Cleanup always runs
- [ ] Artifacts uploaded correctly

---

### Phase 5: Documentation & Optimization
Document the workflow and add optimizations.

- [ ] **Task 13**: Document workflow in README
  - Add "GitHub Actions Integration" section if not exists
  - Document E2E workflow purpose and triggers
  - Explain workflow stages and what they test
  - Add troubleshooting guide for common issues
  - Link to workflow file and badges

- [ ] **Task 14**: Add workflow diagram (optional)
  - Create visual diagram of workflow stages
  - Show dependencies between jobs
  - Include in README or docs

- [ ] **Task 15**: Optimize workflow performance
  - Review cache usage effectiveness
  - Consider parallel job execution where possible
  - Optimize Docker layer caching
  - Review timeout values
  - Measure and document workflow duration

- [ ] **Task 16**: Add matrix testing (optional, future enhancement)
  - Consider testing multiple Node.js versions (18, 20, 22)
  - Consider testing different service configurations
  - Add matrix strategy to workflow if beneficial

**Files to modify:**
- `README.md` (documentation)
- `.github/workflows/e2e-tests.yml` (optimizations)

---

## Workflow Architecture

### Single Comprehensive Workflow (Chosen Approach)

```yaml
E2E Tests Workflow (.github/workflows/e2e-tests.yml)
├── Job: e2e-tests
│   ├── Step 1: Checkout code
│   ├── Step 2: Setup Node.js
│   ├── Step 3: Install xq-infra CLI
│   ├── Step 4: Setup Docker Buildx
│   ├── Step 5: Build Docker images
│   ├── Step 6: Generate compose with xq-infra
│   ├── Step 7: Start services with xq-infra
│   ├── Step 8: Wait for services (health checks)
│   ├── Step 9: Run E2E tests
│   ├── Step 10: Capture logs (on failure)
│   └── Step 11: Cleanup (always)
```

### Environment Variables

```yaml
# E2E Test Configuration
GATEWAY_URL: http://localhost:8080  # Single entry point (default in http-clients.js)

# Database Configuration (for test setup/teardown)
DB_HOST: localhost
DB_PORT: 5432
DB_NAME: todoapp
DB_USER: todouser
DB_PASSWORD: todopass
```

**Note**: Tests use gateway intelligent routing - no need for separate service URLs.

### Expected Timeline

| Stage | Duration | Cacheable |
|-------|----------|-----------|
| Setup & Install | 30-60s | Yes (npm) |
| Docker Build | 3-5min | Yes (layers) |
| Service Startup | 30-60s | No |
| E2E Tests | 2-3min | No |
| Cleanup | 10-30s | No |
| **Total** | **7-11min** | - |

---

## Implementation Notes

### Key Design Decisions
1. **Single workflow file**: All E2E testing in one workflow for simplicity
2. **Multi-file config**: Use `todo-app/services/` directory (new approach)
3. **Auto port assignment**: Let xq-infra assign ports (3002, 3003)
4. **Health checks**: Wait script with timeout for service readiness
5. **Cleanup strategy**: Always run cleanup, even on failure
6. **Log capture**: Automatic log collection using `xq-infra logs` on failure
7. **GitHub token**: Use `secrets.GITHUB_TOKEN` (automatically provided)

### Security Considerations
- GitHub tokens only used in build stage (multi-stage Docker builds)
- No secrets persisted in final Docker images
- Tokens automatically scoped by GitHub Actions
- Database credentials for test environment only (not production)

### Benefits
- ✅ Validates xq-infra CLI in real-world scenario
- ✅ Tests todo-app example application
- ✅ Automates entire test lifecycle
- ✅ Catches integration issues early
- ✅ Provides confidence for releases
- ✅ Documents workflow for contributors

---

## Progress Tracking

**Status**: IN PROGRESS - Phase 2 Complete
**Started**: 2025-10-11
**Last Updated**: 2025-10-11

### Completed Tasks
- [x] Task 1: Create wait-for-services health check script
- [x] Task 2: Create E2E workflow file structure
- [x] Task 3: Implement "Setup" job steps
- [x] Task 4: Implement "Build Docker Images" job steps
- [x] Task 5: Implement "Deploy Test Environment" job steps
- [x] Task 6: Implement "Run E2E Tests" job steps
- [x] Task 7: Implement "Cleanup and Logging" job steps

### In Progress
None - Phases 1 & 2 Complete, ready for Phase 3 (CI workflow update) or Phase 4 (testing)

### Blocked
None

---

## Related Files Reference

**Workflow Files:**
- `.github/workflows/ci.yml` - Existing CLI unit tests
- `.github/workflows/e2e-tests.yml` - NEW E2E workflow (to be created)

**Helper Scripts:**
- `todo-app/e2e-tests/setup/wait-for-services.sh` - NEW health check script (to be created)
- `todo-app/build-all-services.sh` - Build script for Docker images

**E2E Tests:**
- `todo-app/e2e-tests/tests/` - E2E test suite
- `todo-app/e2e-tests/setup/test-setup.js` - Test setup/teardown
- `todo-app/e2e-tests/package.json` - E2E test dependencies

**Service Configuration:**
- `todo-app/services/` - Multi-file service configs (used by workflow)
- `todo-app/services/postgres.service.yml`
- `todo-app/services/todo-read-service.service.yml`
- `todo-app/services/todo-write-service.service.yml`
- `todo-app/services/xq.config.yml`

**Docker Files:**
- `todo-app/src/todo-services/read-service/Dockerfile`
- `todo-app/src/todo-services/write-service/Dockerfile`

---

## Notes for Claude Code

When continuing this work in future sessions:

1. **Check progress**: Look at checkboxes above to see what's completed
2. **Start with**: "Continue from TASKS.md - implement next pending task"
3. **Update this file**: Mark tasks as completed by changing `[ ]` to `[x]`
4. **Add notes**: Add any implementation notes or issues discovered below

### Implementation Notes

**Phase 2 - E2E Workflow Implementation (Completed 2025-10-11)**

Created comprehensive E2E workflow file `.github/workflows/e2e-tests.yml` that includes:

1. **Workflow Triggers**:
   - Push to main branch
   - Pull requests to main branch
   - Path filters for relevant code changes (src/, todo-app/, bin/, workflow file)

2. **Environment Variables**:
   - Single GATEWAY_URL entry point (http://localhost:8080)
   - Database configuration for test setup/teardown
   - All environment variables properly defined at workflow level

3. **Job Structure** (single comprehensive job with 20-minute timeout):
   - Setup: Checkout, Node.js 20, npm cache, xq-infra installation and verification
   - Build: Docker Buildx setup, image building with GITHUB_TOKEN, image verification
   - Deploy: Compose generation, service startup, health check waiting, container verification
   - Test: E2E test dependency installation, test execution with proper env vars, test result upload
   - Cleanup: Log capture on failure, log upload, service cleanup (always runs), container verification

4. **Key Features**:
   - Uses multi-file service configuration (`todo-app/services/`)
   - Implements health check waiting with wait-for-services.sh script
   - Captures and uploads logs only on failure
   - Always runs cleanup step regardless of job outcome
   - Uploads test results as artifacts with 7-day retention
   - Comprehensive container status verification at each stage

5. **Security**:
   - GitHub token passed securely to build process only
   - No secrets persisted in final Docker images
   - Uses GitHub's automatic GITHUB_TOKEN secret

**Phase 1 - Helper Scripts (Already completed)**:
- wait-for-services.sh was already created and is ready to use

**Next Steps**:
- Phase 3 ready for CI workflow review and badge addition
- Phase 4 ready for testing and validation (all prerequisites complete)
