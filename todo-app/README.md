# Todo App - CQRS Microservices Test System

A demonstration of CQRS (Command Query Responsibility Segregation) architecture using separate read and write services for todo list management.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐
│   Read Service  │    │  Write Service  │
│   (Port 3001)   │    │   (Port 3002)   │
│                 │    │                 │
│ GET /api/todos  │    │ POST /api/todos │
│ GET /api/todos/:id│  │ PUT /api/todos/:id│
│ GET /api/todos/ │    │ DELETE /api/todos/:id│
│     statistics  │    │ PATCH /api/todos/│
└─────────┬───────┘    │      bulk-status │
          │            │ DELETE /api/todos/│
          │            │      completed   │
          │            └─────────┬───────┘
          │                      │
          └──────────┬───────────┘
                     │
           ┌─────────▼──────────┐
           │   PostgreSQL DB    │
           │   (Port 5432)      │
           │                    │
           │   todos table      │
           │   - id (serial)    │
           │   - title          │
           │   - description    │
           │   - completed      │
           │   - priority       │
           │   - due_date       │
           │   - created_at     │
           │   - updated_at     │
           └────────────────────┘
```

## Services

### Read Service (Port 3001)
Handles all query operations:
- **GET** `/api/todos` - List todos with filtering, pagination, and search
- **GET** `/api/todos/:id` - Get specific todo by ID
- **GET** `/api/todos/statistics` - Get todo statistics and analytics
- **GET** `/health` - Health check endpoint

### Write Service (Port 3002)
Handles all command operations:
- **POST** `/api/todos` - Create new todo
- **PUT** `/api/todos/:id` - Update existing todo
- **DELETE** `/api/todos/:id` - Delete specific todo
- **PATCH** `/api/todos/bulk-status` - Bulk update todo completion status
- **DELETE** `/api/todos/completed` - Delete all completed todos
- **GET** `/health` - Health check endpoint

### Database
PostgreSQL database with todos table containing:
- Sample data pre-populated
- Indexes for performance
- Timestamps for audit trail

## Quick Start

### Using xq-infra CLI

1. **Generate docker-compose from spec:**
   ```bash
   ../bin/xq-infra.js generate -f todo-system.yml
   ```

2. **Start the services:**
   ```bash
   ../bin/xq-infra.js up -f docker-compose.yml
   ```

3. **Verify services are running:**
   ```bash
   curl http://localhost:3001/health  # Read Service
   curl http://localhost:3002/health  # Write Service
   ```

4. **Stop the services:**
   ```bash
   ../bin/xq-infra.js down -f docker-compose.yml
   ```

### Manual Docker Compose

```bash
# Generate docker-compose file
../bin/xq-infra.js generate -f todo-system.yml

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## API Examples

### Read Operations

```bash
# Get all todos
curl http://localhost:3001/api/todos

# Get todos with pagination
curl "http://localhost:3001/api/todos?page=1&limit=5"

# Filter by completion status
curl "http://localhost:3001/api/todos?completed=true"

# Filter by priority
curl "http://localhost:3001/api/todos?priority=high"

# Search todos
curl "http://localhost:3001/api/todos?search=development"

# Get specific todo
curl http://localhost:3001/api/todos/1

# Get statistics
curl http://localhost:3001/api/todos/statistics
```

### Write Operations

```bash
# Create new todo
curl -X POST http://localhost:3002/api/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Todo",
    "description": "Todo description",
    "priority": "high",
    "due_date": "2024-12-31T23:59:59.000Z"
  }'

# Update todo
curl -X PUT http://localhost:3002/api/todos/1 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Todo",
    "completed": true
  }'

# Delete todo
curl -X DELETE http://localhost:3002/api/todos/1

# Bulk update status
curl -X PATCH http://localhost:3002/api/todos/bulk-status \
  -H "Content-Type: application/json" \
  -d '{
    "ids": [1, 2, 3],
    "completed": true
  }'

# Delete all completed todos
curl -X DELETE http://localhost:3002/api/todos/completed
```

## Development

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose

### Running Locally

1. **Setup database:**
   ```bash
   createdb todoapp
   psql todoapp < src/todo-services/database/init.sql
   ```

2. **Install dependencies:**
   ```bash
   # Read Service
   cd src/todo-services/read-service
   npm install

   # Write Service
   cd ../write-service
   npm install
   ```

3. **Set environment variables:**
   ```bash
   export DB_HOST=localhost
   export DB_USER=todouser
   export DB_PASSWORD=todopass
   export DB_NAME=todoapp
   export DB_PORT=5432
   ```

4. **Start services:**
   ```bash
   # Terminal 1 - Read Service
   cd src/todo-services/read-service
   npm run dev

   # Terminal 2 - Write Service
   cd src/todo-services/write-service
   npm run dev
   ```

### Testing

```bash
# Run tests for both services
cd src/todo-services/read-service
npm test

cd ../write-service
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Linting

```bash
# Check code style
npm run lint

# Auto-fix issues
npm run lint:fix
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host | localhost |
| `DB_USER` | Database user | todouser |
| `DB_PASSWORD` | Database password | todopass |
| `DB_NAME` | Database name | todoapp |
| `DB_PORT` | Database port | 5432 |
| `PORT` | Service port | 3001/3002 |
| `NODE_ENV` | Environment | development |

### Database Schema

```sql
CREATE TABLE todos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Features

### ✅ Implemented
- CQRS architecture with separate read/write services
- RESTful APIs with comprehensive validation
- PostgreSQL integration with connection pooling
- Docker containerization
- Health checks and monitoring
- Comprehensive test suite (unit + integration)
- Request logging and error handling
- Input sanitization and security
- Pagination and filtering
- Bulk operations
- Statistics and analytics

### 🔄 Potential Enhancements
- Event sourcing with message queues
- Redis caching for read service
- API rate limiting
- User authentication and authorization
- Real-time updates with WebSockets
- Metrics and monitoring (Prometheus/Grafana)
- API documentation with Swagger
- E2E tests with Playwright

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL 15
- **Testing:** Jest, Supertest
- **Validation:** express-validator
- **Logging:** @chauhaidang/xq-js-common-kit
- **Containerization:** Docker
- **Orchestration:** xq-infra CLI

## License

MIT License - see LICENSE file for details.