# Person Service - Go REST API

A production-ready Go REST API service with PostgreSQL database integration, following a strict Three-Layer Architecture pattern.

## Project Structure

```
source/
├── main.go                 # Application entry point
├── go.mod                  # Go module definition
├── Dockerfile              # Multi-stage Docker build
├── .dockerignore           # Docker build exclusions
├── logic/
│   └── user.go            # Domain models and interfaces (Logic Layer)
├── dependencies/
│   └── postgres.go        # PostgreSQL repository implementation (Dependencies Layer)
└── handlers/
    └── http.go            # HTTP request handlers (I/O Layer)
```

## Architecture

This service follows the Three-Layer Architecture pattern:

- **Logic Layer** (`logic/`): Contains pure business logic, domain models, and interface definitions. Zero dependencies on the outside world.
- **Dependencies Layer** (`dependencies/`): Implements interfaces defined in the Logic Layer. Handles database operations and external integrations.
- **I/O Layer** (`handlers/`): HTTP handlers that orchestrate Logic and Dependencies layers. No complex business logic here.

## API Endpoints

### Health Check
- `GET /health` - Returns service health status
  ```json
  {
    "status": 200,
    "data": {
      "status": "ok"
    }
  }
  ```

### User Management
- `POST /users` - Create a new user
- `GET /users` - Retrieve all users
- `GET /users/{id}` - Retrieve a specific user
- `PUT /users/{id}` - Update a user
- `DELETE /users/{id}` - Delete a user

## Prerequisites

- Go 1.21 or higher
- PostgreSQL 12 or higher
- Docker (optional, for containerized deployment)

## Configuration

The service is configured via environment variables:

- `PORT` (default: `3000`) - HTTP server port
- `DATABASE_URL` (required) - PostgreSQL connection string
  - Format: `postgres://user:password@host:port/database?sslmode=disable`

## Local Development

### 1. Setup PostgreSQL

```bash
# Using Docker
docker run --name postgres-dev \
  -e POSTGRES_USER=dev \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=person_service \
  -p 5432:5432 \
  -d postgres:15-alpine
```

### 2. Install Dependencies

```bash
cd source
go mod tidy
go mod download
```

### 3. Run the Service

```bash
export DATABASE_URL="postgres://dev:dev@localhost:5432/person_service?sslmode=disable"
export PORT=3000
go run main.go
```

The service will start on `http://localhost:3000`

## Testing the API

### Create a User
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com"
  }'
```

### Get All Users
```bash
curl http://localhost:3000/users
```

### Get a Specific User
```bash
curl http://localhost:3000/users/1
```

### Update a User
```bash
curl -X PUT http://localhost:3000/users/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com"
  }'
```

### Delete a User
```bash
curl -X DELETE http://localhost:3000/users/1
```

### Health Check
```bash
curl http://localhost:3000/health
```

## Docker Deployment

### Build the Docker Image

```bash
docker build -t person-service:latest .
```

### Run the Container

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgres://dev:dev@postgres:5432/person_service?sslmode=disable" \
  -e PORT=3000 \
  person-service:latest
```

### Docker Compose Example

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: person_service
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  person-service:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "postgres://dev:dev@postgres:5432/person_service?sslmode=disable"
      PORT: "3000"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

## Database Schema

The service automatically creates the `users` table on startup:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL
);
```

## Features

- ✅ Clean Three-Layer Architecture
- ✅ PostgreSQL integration with connection pooling
- ✅ Graceful shutdown (SIGTERM/SIGINT)
- ✅ Proper error handling and HTTP status codes
- ✅ JSON request/response encoding
- ✅ Environment-based configuration
- ✅ Database schema auto-creation
- ✅ Multi-stage Docker build
- ✅ Unique constraint violation handling
- ✅ Request timeout settings
- ✅ Health check endpoint
- ✅ Non-root user execution in Docker
- ✅ Docker health check

## Error Handling

The API returns appropriate HTTP status codes:

- `200 OK` - Successful GET/PUT request
- `201 Created` - Successful POST request
- `400 Bad Request` - Invalid request body or parameters
- `404 Not Found` - Resource not found
- `409 Conflict` - Unique constraint violation (e.g., duplicate email)
- `500 Internal Server Error` - Server error
- `405 Method Not Allowed` - Unsupported HTTP method

## Logging

The service logs important events to stdout:

- Server startup with port number
- Database connection status
- Request processing errors
- Graceful shutdown

## Production Considerations

1. **SSL/TLS**: Configure DATABASE_URL with proper SSL mode for production
2. **Secrets**: Use a secrets manager (AWS Secrets Manager, HashiCorp Vault) instead of env vars
3. **Monitoring**: Add metrics collection (Prometheus, DataDog)
4. **Logging**: Use structured logging (logrus, zap)
5. **Rate Limiting**: Add rate limiting middleware for public APIs
6. **Authentication**: Add JWT or OAuth2 for protected endpoints
7. **CORS**: Configure CORS middleware if needed
8. **Database Backups**: Set up automated backups
9. **Load Balancing**: Deploy multiple instances behind a load balancer
10. **Circuit Breaker**: Add circuit breaker pattern for external calls

## Development Tips

- Use `go fmt` to format code
- Run `go vet` to check for common mistakes
- Run `go test ./...` to execute tests
- Use `go mod tidy` to clean up dependencies

## License

Proprietary - Person Service
