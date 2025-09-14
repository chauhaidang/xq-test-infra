# Implementation Plan: Node.js CLI for Test Container Management

**Branch**: `001-node-js-cli` | **Date**: 2025-09-14 | **Spec**: /Users/automation2/Documents/workspace/project/xq-app/xq-test-infra/specs/001-node-js-cli/spec.md
**Input**: Feature specification from `/specs/001-node-js-cli/spec.md`

## Execution Flow (/plan command scope)

1. Load feature spec from Input path — OK
2. Fill Technical Context (resolved NEEDS_CLARIFICATION in research)
3. Constitution check — PASS (see section below)
4. Execute Phase 0 → research.md (created)
5. Execute Phase 1 → data-model.md, contracts/, quickstart.md (created)
6. Re-evaluate Constitution Check — PASS
7. Plan Phase 2 → Describe task generation approach (below)

---

## Summary
Generate a Node.js CLI that: loads container specs (YAML), applies overrides, emits docker-compose.yaml, and manages the lifecycle (start/stop/status) of containers in a session network. It includes a default API gateway (simple reverse proxy) and supports pulling from private registries with runtime credentials. Implementation will use: yaml-js for YAML handling, docker-compose (CLI) for lifecycle orchestration, and commander for CLI parsing.

## Technical Context
- Language/Version: Node.js 18+ (LTS recommended)
- Primary Dependencies: yaml-js (for YAML parsing/emitting), commander (CLI), shelling out to docker-compose (preferred) with optional dockerode later
- Storage: local file state under `.xq-cli/state/{session}.json` (metadata only, no secrets)
- Testing: Jest for unit tests; integration tests use real Docker via `docker compose` on runner (self-hosted or DinD in CI)
- Target Platform: Linux/macOS with Docker installed; CI: GitHub Actions with docker/login-action when private registries used
- Project Type: Single project (CLI + lib modules)
- Constraints: No persisting of secrets; network must be user-defined bridge per session; fail fast on missing Docker daemon

## Constitution Check
- Simplicity: One project (cli + lib) — PASS
- Architecture: Feature delivered as library with CLI wrapper — PASS
- Testing: TDD required; contract tests generated in Phase 1 — PASS (plan requires tests first)
- Observability: CLI supports structured JSON output via `--json` and human-readable logs — PASS
- Versioning: follow semver; CI increments build on merges — NOTE for later

## Project Structure (Decision: Option 1 - Single project)

src/
  ├─ cli/            # commander-based entrypoints
  ├─ lib/
  │   ├─ spec-loader.js
  │   ├─ compose-generator.js
  │   ├─ manager.js   # start/stop/status wrapper around docker-compose
  │   └─ registry.js  # auth helpers
tests/
  ├─ contract/
  ├─ integration/
  └─ unit/

specs/001-node-js-cli/
  ├─ spec.md
  ├─ plan.md
  ├─ research.md
  ├─ data-model.md
  ├─ quickstart.md
  └─ contracts/

---

## Phase 0: Outline & Research (artifacts: research.md)
- Resolved unknowns from spec:
  - Partial management: CLI supports starting/stopping all or individual services; additionally `--ignore` is supported to skip services during start.
  - Gateway features: default simple reverse-proxy that maps routes to service host:port by name. No auth initially; extensible later.
  - Registry credentials: runtime-only via env vars or CLI flags, or rely on `docker login` in CI; DOCKER_CONFIG respected. No persistence.
  - Error handling: on failed image pull or container start, CLI should stop any started services in this session and exit with non-zero and structured error message.
- Tech choices rationale:
  - yaml-js: lightweight YAML parsing and emitting, sufficient for reading multiple spec files and writing docker-compose.yaml.
  - commander: battle-tested CLI parsing and help generation.
  - docker-compose CLI: use `docker compose -f <file> up -d` and `docker compose -f <file> down` for simplicity and predictable behavior across environments. Avoid dockerode initially to reduce complexity.
- Alternatives considered:
  - Using dockerode for fine-grained container control — rejected initially due to higher complexity and parity issues; may be added later if needed.
  - Traefik for gateway — considered, but starting with an in-process or lightweight proxy is faster for tests.

Refer to research.md for full notes.

---

## Phase 1: Design & Contracts (artifacts: data-model.md, contracts/, quickstart.md)

Outputs created:
- data-model.md — entity definitions, validation rules, state model
- contracts/cli-contract.md — CLI command contracts, JSON output shapes
- contracts/gateway-contract.md — gateway routing contract and health endpoints
- quickstart.md — minimal developer quickstart for using the CLI and CI example

Phase 1 notes:
- Contracts will be used to generate failing contract tests in `/tests/contract` (TDD-first).
- Quickstart demonstrates `generate`, `start`, `status`, `stop`, and gateway usage. It also includes recommended GitHub Actions snippet for registry login using `docker/login-action`.

## Phase 2: Task Planning Approach (do NOT execute here)
Describe how tasks will be generated (this document only describes approach):
- Load templates/tasks-template.md
- For each contract and entity produce tasks:
  - Contract test tasks (fail)
  - Data model tasks
  - Compose generator implementation
  - CLI wiring (commander) tasks
  - Integration tests (docker compose based)
  - Gateway proxy implementation
- TDD ordering: contract tests → unit tests → integration tests → implementation
- Expected tasks: 20–35 tasks, prioritized by dependency and parallelizable where independent (e.g., data model vs. gateway proxy can be parallelized after contracts)

---

## Progress Tracking
**Phase Status**:
- [x] Phase 0: Research complete
- [x] Phase 1: Design complete
- [ ] Phase 2: Task planning complete (this file describes approach)
- [ ] Phase 3: Tasks generated (via /tasks)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented (none so far)

---

## Files generated by /plan
- /Users/automation2/Documents/workspace/project/xq-app/xq-test-infra/specs/001-node-js-cli/research.md
- /Users/automation2/Documents/workspace/project/xq-app/xq-test-infra/specs/001-node-js-cli/data-model.md
- /Users/automation2/Documents/workspace/project/xq-app/xq-test-infra/specs/001-node-js-cli/quickstart.md
- /Users/automation2/Documents/workspace/project/xq-app/xq-test-infra/specs/001-node-js-cli/contracts/cli-contract.md
- /Users/automation2/Documents/workspace/project/xq-app/xq-test-infra/specs/001-node-js-cli/contracts/gateway-contract.md


