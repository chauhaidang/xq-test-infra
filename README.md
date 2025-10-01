# XQ Test Infrastructure CLI

A simplified CLI tool for spinning up Docker-based test environments with automatic log capture and built-in gateway support.

## 🚀 Quick Start

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

## 🎯 Features

- **Simplified Commands**: No complex arguments - just `generate`, `up`, and `down`
- **On-Demand Log Viewing**: Flexible log viewing with service filtering and real-time following
- **Built-in Gateway**: Nginx reverse proxy for unified service access
- **Service Overrides**: JSON-based configuration overrides for different environments
- **Docker Integration**: Works with Docker Compose v2 and v1
- **CI/CD Ready**: GitHub Actions integration examples
- **Multi-stage Security**: Secure Docker builds with token management
- **Next change**: see [TASKS](./TASKS.md)

## 📋 Table of Contents

- [Installation](#installation)
- [Commands](#commands)
- [XQ Specification Format](#xq-specification-format)
- [Log Viewing](#log-viewing)
- [Service Overrides](#service-overrides)
- [Gateway Configuration](#gateway-configuration)
- [Registry Authentication](#registry-authentication)
- [GitHub Actions Integration](#github-actions-integration)
- [Examples](#examples)
- [Todo App Example](#todo-app-example)
- [Migration Guide](#migration-guide)
- [Troubleshooting](#troubleshooting)

## 📦 Installation

### Prerequisites
- Node.js 18+ or 20+ (LTS recommended)
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

## 🛠️ Commands

| Command | Description | Output |
|---------|-------------|---------|
| `generate -f spec.yaml` | Create docker-compose from XQ spec | `xq-compose.yml` |
| `up` | Start services (detached + logging) | Containers running |
| `down` | Stop services and cleanup | Clean shutdown |
| `logs [service]` | View container logs | Log output |

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

### Down Command
Stop and remove services from `xq-compose.yml`.

```bash
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

## 📝 XQ Specification Format

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

### Complete Example
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

## 📊 Log Viewing

The CLI provides flexible log viewing capabilities through the `logs` command.

### Features
- **On-demand viewing**: Logs are shown only when requested
- **Service-specific logs**: View logs from individual services or all services
- **Real-time following**: Use `-f` flag for live log streaming
- **Customizable output**: Control number of lines and timestamp display
- **No background processes**: Commands return immediately

### Examples

```bash
# View all service logs (last 100 lines)
xq-infra logs

# Follow logs in real-time
xq-infra logs -f

# View specific service logs
xq-infra logs frontend
xq-infra logs backend -f

# Customized output
xq-infra logs --tail 50 --timestamps

# Combine with standard tools
xq-infra logs | grep -i error
xq-infra logs backend | grep "database connection"
```

## 🔧 Service Overrides

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

## 🌐 Gateway Configuration

The CLI automatically adds an nginx gateway service that provides:
- Single entry point for all services
- Service routing via path prefixes
- Load balancing and health checking

### Gateway Features
- **URL Pattern**: `http://localhost:8081/{service-name}/`
- **Service Discovery**: Automatic upstream configuration
- **Port Detection**: Extracts container ports from service definitions
- **Health Checks**: Basic nginx proxy health checking

### Gateway Access Examples
If you have services named `api` and `web`:
- API service: `http://localhost:8081/api/`
- Web service: `http://localhost:8081/web/`
- Direct nginx: `http://localhost:8081/`

### Disabling Gateway
```bash
xq-infra generate -f services.yaml --no-gateway
```

## 🔐 Registry Authentication

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

## 🚀 GitHub Actions Integration

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
      run: npm install

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
        npm test

        # View logs if tests fail
        if [ $? -ne 0 ]; then
          ./bin/xq-infra.js logs
        fi

    - name: Cleanup
      if: always()
      run: ./bin/xq-infra.js down
```

## 📚 Examples

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
curl http://localhost:8080/
curl http://localhost:8081/backend/health  # Via gateway

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

## 🧪 Todo App Example

This repository includes a complete todo application example that demonstrates real-world usage:

### Architecture
```
┌─────────────────┐    ┌─────────────────┐
│  Read Service   │    │  Write Service  │
│    Port: 3001   │    │    Port: 3002   │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          └──────────┬───────────┘
                     │
            ┌─────────▼───────┐
            │   PostgreSQL    │
            │    Port: 5432   │
            └─────────────────┘
```

### Quick Start with Todo App
```bash
# Build the todo app images
cd todo-app
./build-all-services.sh --github-token YOUR_TOKEN

# Generate and start with xq-infra
cd ..
./bin/xq-infra.js generate -f todo-app/todo-system.yml
./bin/xq-infra.js up

# Test the application
curl http://localhost:3001/todos          # Get todos
curl -X POST http://localhost:3002/todos \  # Create todo
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "priority": "high"}'

# View logs
./bin/xq-infra.js logs
```

For complete todo app documentation, see [todo-app/README.md](./todo-app/README.md).

## 🛠️ Troubleshooting

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
**Solution**: Add user to docker group:
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

# Check service status
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

## 📄 Requirements

- Node.js 18+ or 20+ (LTS recommended)
- Docker Engine 20.10+ with Compose plugin
- Git (for cloning)

## 📊 Version

Current version: **0.0.2** - Key improvements:
- Simplified command interface
- Integrated log viewing
- On-demand debugging
- Better CI/CD integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests and documentation
5. Submit a pull request

## 🔗 Links

- **Repository**: https://github.com/chauhaidang/xq-test-infra
- **Issues**: https://github.com/chauhaidang/xq-test-infra/issues
- **Examples**: [./examples/](./examples/)

## 📝 License

Apache License 2.0 - see [LICENSE](LICENSE) file for details.

---

**Getting Help**
- Check command help: `xq-infra <command> --help`
- View logs: `xq-infra logs`
- Report issues: https://github.com/chauhaidang/xq-test-infra/issues