# Research: Node.js CLI for Test Container Management

## Purpose
Provide concise research and decisions to guide implementation of the CLI that: reads container spec YAML files, applies overrides, emits docker-compose.yaml, manages lifecycle (start/stop/status) of services attached to a session network, provides a default API gateway, and supports private registries and image tag overrides.

## Libraries & tools evaluated
- yaml-js (chosen) — lightweight YAML parser/serializer. Matches project constraints and the user's explicit choice. Supports load/dump for basic YAML needs.
- js-yaml — mature alternative with more features; available as a fallback if yaml-js proves insufficient.
- commander (chosen) — stable CLI parsing and help generation.
- docker compose CLI (chosen) — orchestrate with `docker compose -f <file> up -d` / `down`; easier and more predictable for compose features (networks, volumes) than reimplementing orchestration.
- dockerode — programmatic Docker client; considered for future iterations where fine-grained control (auth on pull, container inspect) is needed.
- express — chosen for the MVP gateway (simple reverse proxy). Traefik considered as an optional container-based gateway for more advanced routing.

## Decisions (summary & rationale)
- YAML library: use yaml-js as primary per project decision. Provide a fallback to js-yaml when available for more robust dumping options.
- CLI framework: commander for subcommands, global flags (`--json`), and help output.
- Compose orchestration: shell out to `docker compose`. This keeps behavior consistent with Docker tooling and leverages Docker's pull/auth behavior (uses local Docker credentials).
- Registry authentication: do not persist credentials. Prefer Docker's credential store (`DOCKER_CONFIG` / `~/.docker/config.json`) and recommend `docker login` in CI. Support runtime flags/env variables (e.g., XQ_CLI_REGISTRY_TOKEN) to surface auth information; for direct pulls with dockerode, build authconfig from flags/env if required.
- Gateway: implement an Express-based reverse proxy for MVP. Optionally provide a Traefik mode by emitting Traefik dynamic config and adding Traefik service to the generated compose.
- Error handling: on failure during start (image pull or container creation), attempt best-effort rollback (stop/remove started containers for the session) and surface structured error output when `--json` is used.

## Compose & networking notes
- Compose output: use `version: '3.8'` and include a networks section with a user-defined bridge named `xq-{session}` to ensure inter-service DNS resolution by service name.
- Generated services should include `networks: ['xq-network']` or explicit network aliases where required. The compose file should map host ports only when specified in spec or overrides.
- Provide CLI flags to include/exclude services (e.g., `--ignore`) and to override registry prefix and tags.

## Registry & image pulls
- Preferred flow: let `docker compose` handle pulls and credential resolution (it respects Docker's credential store). This means CI should authenticate via `docker/login-action` or runner-level login.
- For environments needing programmatic pulls or where `docker compose` isn't available, optionally use dockerode and pass `authconfig` derived from runtime flags/env variables. Precedence for auth values:
  1. CLI flags (`--auth-token`, `--auth-user`/`--auth-pass`)
  2. Environment variables (`XQ_CLI_REGISTRY_TOKEN`, `XQ_CLI_REGISTRY_USER`, `XQ_CLI_REGISTRY_PASS`)
  3. DOCKER_CONFIG (`~/.docker/config.json`) lookup
  4. CI-provided tokens (e.g., `GITHUB_TOKEN` or `secrets.REGISTRY_TOKEN` used by docker/login-action)
- The CLI should not write tokens to state; recommend masking tokens in logs and encouraging docker-login for CI workflows.

## Gateway tradeoffs
- Express-based proxy (MVP)
  - Pros: simple, quick to implement in Node, easy to read route map from specs and forward to `${service}:${port}` inside the session network.
  - Cons: limited feature set compared to dedicated reverse proxies (no automatic service discovery, limited metrics, requires the CLI process or a container to run it).
- Traefik (optional mode)
  - Pros: production-grade routing, dynamic providers, built-in health checks and metrics.
  - Cons: more complex to configure in dynamic mode (need to generate file provider config or labels) and heavier for local test runs.

Recommendation: implement Express for MVP and provide a `--gateway traefik` option in the generator that will add a Traefik service and generated dynamic config to the compose file for later use.

## Testing & CI considerations
- Unit tests: parsing, merging overrides, compose generation. Use Jest for units.
- Contract tests: CLI JSON shapes and exit codes as defined in contracts/cli-contract.md (fail-first tests).
- Integration tests: require a Docker-capable runner. Use small official images (nginx, httpd, or lightweight node images) as fixtures. Tests should perform: `generate` -> `docker compose -f out up -d` -> assert inter-service connectivity and gateway proxy -> `docker compose -f out down`.
- CI: Recommend GitHub Actions with a job that uses a self-hosted runner with Docker, or use DinD with privileged runner and `services: docker` where supported. Include `docker/login-action` in workflows when private registries are required.

## Security & privacy
- Do not store secrets in state or commit them. State files must contain only non-secret metadata (compose path, session id, container IDs).
- Mask tokens in logs. If `--json` is used, ensure token fields are omitted from machine output.
- Validate overrides to avoid allowing arbitrary file writes or dangerous host mounts unless explicitly requested.

## Risks & mitigations
- Docker compose not available on runner: detect early and provide clear error and remediation steps (install Docker CLI or use dockerode fallback).
- Long image pulls: provide a `--no-pull` option and informative progress messages; recommend cached images in CI runners when possible.
- Port conflicts: pre-check host port bindings and fail fast with remediation advice (use alternate host port or remove conflicting process).
- Auth failures (401/403): surface the docker error and suggest `docker login` or providing tokens via environment/CI secrets.

## References
- yaml-js (chosen library) — basic load/dump API
- js-yaml — robust YAML alternative
- Docker Compose CLI docs — `docker compose` usage
- dockerode — Node Docker API client (future option)
- Traefik docs — dynamic config and Docker provider for optional gateway mode

