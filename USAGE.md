# XQ Test Infrastructure CLI - Usage Guide

This guide provides comprehensive instructions for using the xq-infra CLI tool to manage Docker-based test environments.

## Table of Contents
- [Installation](#installation)
- [Quick Start](#quick-start)
- [XQ Specification Format](#xq-specification-format)
- [CLI Commands](#cli-commands)
- [Service Overrides](#service-overrides)
- [Gateway Configuration](#gateway-configuration)
- [Registry Authentication](#registry-authentication)
- [GitHub Actions Integration](#github-actions-integration)
- [Examples](#examples)
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
# Generate docker-compose file
./bin/xq-infra.js generate -f my-services.yaml -o docker-compose.yml

# Start services
./bin/xq-infra.js up -f docker-compose.yml -d

# Check status
docker compose -f docker-compose.yml ps

# Stop and clean up
./bin/xq-infra.js down -f docker-compose.yml
```

3. **Access your services**:
- Web app: http://localhost:8080/web-app/
- Database: localhost:5432
- Gateway (all services): http://localhost:8080/

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
Generate a docker-compose file from an XQ specification.

```bash
xq-infra generate [options]

Options:
  -f, --file <path>         Path to XQ YAML spec (required)
  -o, --out <path>          Output path for generated docker-compose file
  --no-gateway              Disable default gateway injection
  --keep-file               Keep generated compose file after run
  --overrides <path>        Path to JSON file with overrides
```

**Examples:**
```bash
# Basic generation
xq-infra generate -f services.yaml

# Custom output location
xq-infra generate -f services.yaml -o my-compose.yml

# Without gateway
xq-infra generate -f services.yaml --no-gateway

# With overrides
xq-infra generate -f services.yaml --overrides overrides.json
```

### Up Command
Start services from a docker-compose file.

```bash
xq-infra up [options]

Options:
  -f, --file <path>         Path to docker-compose.yaml to run (required)
  -d, --detached            Run in detached mode
  --pull                    Pull images before starting
```

**Examples:**
```bash
# Start in foreground (shows logs)
xq-infra up -f docker-compose.yml

# Start in background
xq-infra up -f docker-compose.yml -d

# Pull latest images first
xq-infra up -f docker-compose.yml -d --pull
```

### Down Command
Stop and remove services started by the compose file.

```bash
xq-infra down [options]

Options:
  -f, --file <path>         Path to docker-compose.yaml used to run (required)
```

**Example:**
```bash
xq-infra down -f docker-compose.yml
```

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
        ./bin/xq-infra.js generate -f test-spec.yaml -o test-compose.yml
        ./bin/xq-infra.js up -f test-compose.yml -d

    - name: Run tests
      run: |
        # Your test commands here
        npm test

    - name: Cleanup
      if: always()
      run: |
        ./bin/xq-infra.js down -f test-compose.yml
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
          --overrides environments/${{ matrix.environment }}.json \\
          -o ${{ matrix.environment }}-compose.yml
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
xq-infra generate -f web-app.yaml -o app-compose.yml
xq-infra up -f app-compose.yml -d

# Access services
curl http://localhost:8080/frontend/
curl http://localhost:8080/backend/health
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
xq-infra generate -f base.yaml --overrides dev-overrides.json -o dev-compose.yml
xq-infra up -f dev-compose.yml -d
```

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
docker compose -f docker-compose.yml logs <service-name>

# Check service status
docker compose -f docker-compose.yml ps
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
xq-infra generate -f services.yaml -o test-compose.yml
docker compose -f test-compose.yml config
```

### Getting Help
- Check command help: `xq-infra <command> --help`
- View logs: `docker compose -f <file> logs`
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