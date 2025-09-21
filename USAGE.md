# XQ Test Infrastructure CLI - Usage Guide

This guide provides comprehensive instructions for using the xq-infra CLI tool to manage Docker-based test environments with simplified commands and on-demand log viewing.

## Table of Contents
- [Installation](#installation)
- [Quick Start](#quick-start)
- [XQ Specification Format](#xq-specification-format)
- [CLI Commands](#cli-commands)
- [On-Demand Log Viewing](#on-demand-log-viewing)
- [Service Overrides](#service-overrides)
- [Gateway Configuration](#gateway-configuration)
- [Registry Authentication](#registry-authentication)
- [GitHub Actions Integration](#github-actions-integration)
- [Examples](#examples)
- [Migration Guide](#migration-guide)
- [Troubleshooting](#troubleshooting)

## Installation

### Prerequisites
- Node.js 18.x or 20.x (LTS recommended)
- Docker Engine 20.10+ with Compose plugin
- Git (for cloning)

### Install from Source
```bash
git clone https://github.com/chauhaidang/xq-test-infra.git
cd xq-test-infra
npm install
npm link  # Optional: make xq-infra available globally
```

### Verify Installation
```bash
./bin/xq-infra.js --version
./bin/xq-infra.js --help
```

## Quick Start

1. **Create an XQ specification file** (`my-services.yaml`):
```yaml
services:
  web-app:
    image: nginx
    tag: alpine
    ports:
      - "8080:80"
    environment:
      NGINX_HOST: localhost

  database:
    image: postgres
    tag: "15"
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: testdb
      POSTGRES_USER: testuser
      POSTGRES_PASSWORD: testpass
```

2. **Generate and start your environment**:
```bash
# Generate compose file (creates xq-compose.yml)
./bin/xq-infra.js generate -f my-services.yaml

# Start services (detached mode)
./bin/xq-infra.js up

# Check status
docker ps

# View logs when needed
./bin/xq-infra.js logs
./bin/xq-infra.js logs -f  # Follow in real-time

# Stop and clean up
./bin/xq-infra.js down
```

3. **Access your services**:
- Web app: http://localhost:8080/web-app/
- Database: localhost:5432
- Gateway (all services): http://localhost:8081/ (auto-assigned port)
- View logs: `./bin/xq-infra.js logs`

## XQ Specification Format

The XQ spec is a YAML file that defines your test environment services:

```yaml
services:
  service-name:
    image: image-name          # Required: Docker image name
    tag: image-tag             # Optional: defaults to 'latest'
    ports:                     # Optional: port mappings
      - "host:container"
      - "container"
    environment:               # Optional: environment variables
      KEY: value
    volumes:                   # Optional: volume mounts
      - "/host/path:/container/path"
      - "volume-name:/container/path"
    command:                   # Optional: override container command
      - "command"
      - "arg1"
      - "arg2"
    depends_on:               # Optional: service dependencies
      - "other-service"
```

### Example with All Options
```yaml
services:
  api:
    image: node
    tag: 18-alpine
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://user:pass@database:5432/mydb
    volumes:
      - "./src:/app/src"
      - "node_modules:/app/node_modules"
    command:
      - "npm"
      - "run"
      - "start:prod"
    depends_on:
      - database

  database:
    image: postgres
    tag: "15"
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - "pgdata:/var/lib/postgresql/data"
```

## CLI Commands

### Generate Command
Generate `xq-compose.yml` from an XQ specification.

```bash
xq-infra generate [options]

Options:
  -f, --file <path>         Path to XQ YAML spec (required)
  --no-gateway              Disable default gateway injection
  --keep-file               Keep generated compose file after run
  --overrides <path>        Path to JSON file with overrides
```

**Examples:**
```bash
# Basic generation (creates xq-compose.yml)
xq-infra generate -f services.yaml

# Without gateway
xq-infra generate -f services.yaml --no-gateway

# With overrides
xq-infra generate -f services.yaml --overrides overrides.json
```

### Up Command
Start services from `xq-compose.yml` in detached mode.

```bash
xq-infra up [options]

Options:
  --pull                    Pull images before starting
```

**Examples:**
```bash
# Start services (detached mode)
xq-infra up

# Pull latest images first
xq-infra up --pull
```

### Down Command
Stop and remove services from `xq-compose.yml`.

```bash
xq-infra down
```

**Example:**
```bash
# Stop all services
xq-infra down
```

### Logs Command
View logs from services in `xq-compose.yml`.

```bash
xq-infra logs [service] [options]

Options:
  -f, --follow              Follow log output in real-time
  -t, --tail <lines>        Number of lines to show (default: 100)
  --timestamps              Show timestamps
  [service]                 Optional: specific service name
```

**Examples:**
```bash
# View last 100 lines of all service logs
xq-infra logs

# Follow logs in real-time (similar to tail -f)
xq-infra logs -f

# View logs for specific service
xq-infra logs frontend

# View last 50 lines with timestamps
xq-infra logs --tail 50 --timestamps

# Follow specific service logs
xq-infra logs backend -f
```

## On-Demand Log Viewing

The CLI provides flexible log viewing capabilities through the `logs` command, using Docker Compose's native logging functionality.

### Features
- **On-demand viewing**: Logs are shown only when requested
- **Service-specific logs**: View logs from individual services or all services
- **Real-time following**: Use `-f` flag for live log streaming
- **Customizable output**: Control number of lines and timestamp display
- **No background processes**: Commands return immediately, no CLI hanging

### Log Viewing Options

#### View All Service Logs
```bash
# Last 100 lines from all services (default)
xq-infra logs

# Last 50 lines from all services
xq-infra logs --tail 50

# All logs with timestamps
xq-infra logs --timestamps
```

#### Follow Logs in Real-Time
```bash
# Follow all service logs (like tail -f)
xq-infra logs -f

# Follow with timestamps
xq-infra logs -f --timestamps

# Follow last 20 lines then continue
xq-infra logs -f --tail 20
```

#### Service-Specific Logs
```bash
# View logs for specific service
xq-infra logs frontend
xq-infra logs backend
xq-infra logs database

# Follow specific service logs
xq-infra logs frontend -f

# Last 25 lines from specific service
xq-infra logs backend --tail 25
```

### Combining with Standard Tools
```bash
# Search for errors in logs
xq-infra logs | grep -i error

# Search specific service logs
xq-infra logs backend | grep "database connection"

# Save logs to file
xq-infra logs --timestamps > service-logs.txt

# Monitor logs with less
xq-infra logs -f | less
```

### Log Output Format
The logs command uses Docker Compose's standard log format:
```
frontend-1  | 192.168.1.1 - - [21/Sep/2025:15:30:01 +0000] "GET / HTTP/1.1" 200 612
backend-1   | [2025-09-21 15:30:01] INFO: Server started on port 3000
database-1  | 2025-09-21 15:30:01.123 UTC [1] LOG:  database system is ready
```

### Benefits of On-Demand Approach
- **No CLI hanging**: Commands return immediately after starting services
- **User controlled**: View logs only when needed
- **Familiar interface**: Similar to standard Docker commands
- **Reliable**: Uses native Docker Compose logging without background processes
- **Flexible**: Full control over log viewing options

## Service Overrides

Override specific service configurations without modifying the original XQ spec.

### Override File Format
Create a JSON file with overrides:

```json
{
  "services": {
    "web-app": {
      "tag": "latest",
      "environment": {
        "DEBUG": "true",
        "LOG_LEVEL": "debug"
      },
      "ports": ["9090:80"]
    },
    "database": {
      "tag": "14",
      "environment": {
        "POSTGRES_PASSWORD": "newpassword"
      }
    }
  }
}
```

### Using Overrides
```bash
xq-infra generate -f base-spec.yaml --overrides dev-overrides.json
```

### Precedence Order
1. Override file values (highest priority)
2. Original XQ spec values
3. Default values (lowest priority)

## Gateway Configuration

The CLI automatically adds an nginx gateway service that provides:
- Single entry point for all services
- Service routing via path prefixes
- Load balancing and health checking

### Gateway Features
- **URL Pattern**: `http://localhost:8080/{service-name}/`
- **Service Discovery**: Automatic upstream configuration
- **Port Detection**: Extracts container ports from service definitions
- **Health Checks**: Basic nginx proxy health checking

### Gateway Access Examples
If you have services named `api` and `web`:
- API service: `http://localhost:8080/api/`
- Web service: `http://localhost:8080/web/`
- Direct nginx: `http://localhost:8080/`

### Disabling Gateway
```bash
xq-infra generate -f services.yaml --no-gateway
```

## Registry Authentication

### Local Development
For private registries, authenticate before running:

```bash
# Docker Hub
docker login

# GitHub Container Registry
docker login ghcr.io -u USERNAME -p TOKEN

# Private registry
docker login registry.example.com -u USERNAME -p PASSWORD
```

### Environment Variables
Set these variables for automatic authentication:

```bash
export DOCKER_USERNAME="your-username"
export DOCKER_PASSWORD="your-password"
# or
export REGISTRY_USERNAME="your-username"
export REGISTRY_PASSWORD="your-password"
```

### Programmatic Authentication
The CLI provides helper methods for authentication:

```javascript
const registryAuth = require('./src/services/registryAuth')

// Auto-login based on environment
await registryAuth.autoLogin('ghcr.io')

// GitHub Actions login
await registryAuth.loginFromGitHubActions()

// Manual login
await registryAuth.login('registry.example.com', 'user', 'pass')
```

## GitHub Actions Integration

### Basic Workflow
```yaml
name: Test Infrastructure

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install xq-infra
      run: |
        npm install

    - name: Setup Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Login to GitHub Container Registry
      uses: docker/login-action@v3
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Start test environment
      run: |
        ./bin/xq-infra.js generate -f test-spec.yaml
        ./bin/xq-infra.js up

    - name: Run tests
      run: |
        # Your test commands here
        npm test

        # View logs if tests fail
        if [ $? -ne 0 ]; then
          ./bin/xq-infra.js logs
        fi

    - name: Cleanup
      if: always()
      run: |
        ./bin/xq-infra.js down
```

### Private Registry Access
```yaml
    - name: Login to Private Registry
      uses: docker/login-action@v3
      with:
        registry: registry.example.com
        username: ${{ secrets.REGISTRY_USERNAME }}
        password: ${{ secrets.REGISTRY_PASSWORD }}
```

### Matrix Testing
```yaml
    strategy:
      matrix:
        environment: [development, staging, production]

    steps:
    - name: Generate environment-specific compose
      run: |
        ./bin/xq-infra.js generate \\
          -f base-spec.yaml \\
          --overrides environments/${{ matrix.environment }}.json
```

## Examples

### Example 1: Web Application with Database
```yaml
# web-app.yaml
services:
  frontend:
    image: nginx
    tag: alpine
    ports:
      - "8080:80"
    volumes:
      - "./public:/usr/share/nginx/html"

  backend:
    image: node
    tag: 18-alpine
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://app:secret@postgres:5432/appdb
      NODE_ENV: development
    depends_on:
      - postgres

  postgres:
    image: postgres
    tag: "15"
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: app
      POSTGRES_PASSWORD: secret
    volumes:
      - "pgdata:/var/lib/postgresql/data"
```

```bash
# Start the environment
xq-infra generate -f web-app.yaml
xq-infra up

# Access services
curl http://localhost:8080/frontend/
curl http://localhost:8081/backend/health  # Gateway on auto-assigned port

# View logs
xq-infra logs
xq-infra logs -f  # Follow in real-time
```

### Example 2: Microservices with Message Queue
```yaml
# microservices.yaml
services:
  user-service:
    image: myapp/user-service
    tag: latest
    ports:
      - "3001:3000"
    environment:
      REDIS_URL: redis://redis:6379
      DB_HOST: postgres
    depends_on:
      - postgres
      - redis

  order-service:
    image: myapp/order-service
    tag: latest
    ports:
      - "3002:3000"
    environment:
      REDIS_URL: redis://redis:6379
      USER_SERVICE_URL: http://user-service:3000
    depends_on:
      - redis
      - user-service

  postgres:
    image: postgres
    tag: "15"
    environment:
      POSTGRES_DB: microservices
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: admin123

  redis:
    image: redis
    tag: alpine
    ports:
      - "6379:6379"
```

### Example 3: Development with Override
Base specification (`base.yaml`):
```yaml
services:
  api:
    image: myapp/api
    tag: stable
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
```

Development overrides (`dev-overrides.json`):
```json
{
  "services": {
    "api": {
      "tag": "development",
      "environment": {
        "NODE_ENV": "development",
        "DEBUG": "true",
        "LOG_LEVEL": "debug"
      },
      "volumes": [
        "./src:/app/src",
        "./package.json:/app/package.json"
      ]
    }
  }
}
```

```bash
# Generate development environment
xq-infra generate -f base.yaml --overrides dev-overrides.json
xq-infra up
```

## Migration Guide

### Upgrading from Previous Versions

If you were using an earlier version of xq-infra, here's how to migrate to the new simplified interface:

#### **Command Changes**

**Old workflow:**
```bash
# Version 0.0.1 and earlier
xq-infra generate -f services.yaml -o my-compose.yml
xq-infra up -f my-compose.yml -d
docker compose -f my-compose.yml logs  # Manual Docker command
xq-infra down -f my-compose.yml
```

**New workflow:**
```bash
# Version 0.0.2 and later
xq-infra generate -f services.yaml      # Creates xq-compose.yml
xq-infra up                             # Detached mode (returns immediately)
xq-infra logs                           # View logs when needed
xq-infra logs -f                        # Follow logs in real-time
xq-infra down                           # Stops everything
```

#### **File Changes**

| Old | New | Notes |
|-----|-----|-------|
| Custom output path (`-o`) | `xq-compose.yml` | Fixed filename in current directory |
| Manual `docker compose logs` | `xq-infra logs` | Integrated logs command |
| `-f` file arguments | Implicit usage | Commands auto-use `xq-compose.yml` |
| `-d` detached flag | Always detached | Detached mode is now default |

#### **Breaking Changes**
- **Removed flags**: `-o/--out`, `-f/--file`, `-d/--detached`
- **Fixed filenames**: Must use `xq-compose.yml` and `xq-infra.log`
- **No custom output paths**: Files always created in current directory

#### **Benefits of Migration**
- **Fewer arguments**: Simpler commands with less typing
- **Integrated logging**: Built-in logs command with flexible options
- **Consistent workflow**: Same commands work across all environments
- **Better debugging**: On-demand log viewing with service-specific options

#### **Compatibility**
- **XQ spec format**: No changes required to your YAML specifications
- **Service configurations**: All existing service definitions work unchanged
- **Gateway functionality**: Same nginx gateway behavior
- **Override files**: JSON override format remains the same

## Troubleshooting

### Common Issues

#### 1. Docker Compose Not Found
```
Error: Neither "docker compose" nor "docker-compose" command found
```
**Solution**: Install Docker with Compose plugin or docker-compose standalone.

#### 2. Permission Denied
```
Error: docker: permission denied
```
**Solution**: Add user to docker group or use sudo:
```bash
sudo usermod -aG docker $USER
# Log out and back in
```

#### 3. Port Already in Use
```
Error: bind: address already in use
```
**Solution**: Change ports in your XQ spec or stop conflicting services:
```bash
docker ps  # Check running containers
docker stop <container-id>
```

#### 4. Image Pull Failures
```
Error: pull access denied for image
```
**Solution**: Authenticate to the registry:
```bash
docker login <registry-url>
```

#### 5. Service Not Starting
```bash
# Check service logs
xq-infra logs <service-name>

# Check service status (use docker directly)
docker compose -f xq-compose.yml ps
```

### Debug Mode
Enable verbose logging:
```bash
export DEBUG=xq-infra:*
xq-infra generate -f services.yaml
```

### File Validation
Validate your XQ spec:
```bash
# Check YAML syntax
python -c "import yaml; yaml.safe_load(open('services.yaml'))"

# Generate and validate compose file
xq-infra generate -f services.yaml
docker compose -f xq-compose.yml config
```

### Getting Help
- Check command help: `xq-infra <command> --help`
- View logs: `xq-infra logs`
- Report issues: https://github.com/chauhaidang/xq-test-infra/issues

## Advanced Configuration

### Custom Network Settings
The CLI creates a dedicated network `xq-network` for service communication. Services can reference each other by name.

### Resource Limits
Add resource constraints via overrides:
```json
{
  "services": {
    "database": {
      "deploy": {
        "resources": {
          "limits": {
            "memory": "512M",
            "cpus": "0.5"
          }
        }
      }
    }
  }
}
```

### Health Checks
Add health checks via overrides:
```json
{
  "services": {
    "api": {
      "healthcheck": {
        "test": ["CMD", "curl", "-f", "http://localhost:3000/health"],
        "interval": "30s",
        "timeout": "10s",
        "retries": 3
      }
    }
  }
}
```

This completes the comprehensive usage guide for the XQ Test Infrastructure CLI. The tool provides a powerful yet simple way to manage Docker-based test environments with minimal configuration.