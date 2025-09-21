# XQ Test Infrastructure CLI

A simplified CLI tool for spinning up Docker-based test environments with automatic log capture.

## Quick Start

```bash
# Install dependencies
npm install

# Create your XQ spec (YAML)
cat > my-app.yaml << EOF
services:
  web:
    image: nginx
    tag: alpine
    ports:
      - "8080:80"
  api:
    image: node
    tag: 18-alpine
    ports:
      - "3000:3000"
EOF

# Generate and start environment
./bin/xq-infra.js generate -f my-app.yaml
./bin/xq-infra.js up

# View logs when needed
./bin/xq-infra.js logs
./bin/xq-infra.js logs -f  # Follow in real-time

# Stop when done
./bin/xq-infra.js down
```

## Features

- **Simplified Commands**: No complex arguments - just `generate`, `up`, and `down`
- **Automatic Log Capture**: All container logs streamed to `xq-infra.log`
- **Built-in Gateway**: Nginx reverse proxy for unified service access
- **Service Overrides**: JSON-based configuration overrides
- **Docker Integration**: Works with Docker Compose v2 and v1
- **CI/CD Ready**: GitHub Actions integration examples

## Commands

| Command | Description | Output |
|---------|-------------|---------|
| `generate -f spec.yaml` | Create docker-compose from XQ spec | `xq-compose.yml` |
| `up` | Start services (detached + logging) | Containers + `xq-infra.log` |
| `down` | Stop services and log streaming | Clean shutdown |

## File Structure

```
project/
├── my-spec.yaml          # Your XQ specification
├── xq-compose.yml        # Generated (auto-created)
├── xq-infra.log         # Container logs (auto-created)
└── nginx-gateway.conf   # Gateway config (auto-created)
```

## Documentation

- **[Usage Guide](./USAGE.md)** - Comprehensive usage instructions
- **[Change Log](./CHANGE.md)** - Version history and migration guide
- **[Examples](./examples/)** - Sample XQ specifications

## Requirements

- Node.js 18+ or 20+
- Docker Engine 20.10+ with Compose plugin
- Git (for cloning)

## Installation

```bash
git clone https://github.com/chauhaidang/xq-test-infra.git
cd xq-test-infra
npm install
```

## Version

Current version: **0.0.2** - [See changelog](./CHANGE.md) for what's new!