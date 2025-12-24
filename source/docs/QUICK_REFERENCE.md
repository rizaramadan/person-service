# Quick Reference Guide

## 📋 Command Line Reference

### Build & Run Locally

```bash
# Install dependencies
go mod download
go mod tidy

# Build binary
go build -o person-service .

# Run the service
export DATABASE_URL="postgres://dev:dev@localhost:5432/person_service?sslmode=disable"
export PORT=3000
./person-service
```

### Docker Commands

```bash
# Build Docker image
docker build -t person-service:latest .

# Run container (standalone)
docker run -p 3000:3000 \
  -e DATABASE_URL="postgres://dev:dev@postgres:5432/person_service?sslmode=disable" \
  person-service:latest

# Build and run with docker-compose
docker-compose up --build

# Stop services
docker-compose down

# View logs
docker-compose logs -f person-service
```

### Database Setup

```bash
# Start PostgreSQL with Docker
docker run --name postgres-dev \
  -e POSTGRES_USER=dev \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=person_service \
  -p 5432:5432 \
  -d postgres:15-alpine

# Connect to database
psql -h localhost -U dev -d person_service

# Verify table creation
SELECT * FROM users;
```

---

## 🧪 API Testing

### Health Check
```bash
curl http://localhost:3000/health
```

### Create User
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'
```

### Get All Users
```bash
curl http://localhost:3000/users
```

### Get Single User
```bash
curl http://localhost:3000/users/1
```

### Update User
```bash
curl -X PUT http://localhost:3000/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Jane Doe", "email": "jane@example.com"}'
```

### Delete User
```bash
curl -X DELETE http://localhost:3000/users/1
```

### Run Complete Test Suite
```bash
chmod +x test-api.sh
./test-api.sh
```

---

## 📊 Expected HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | GET, PUT requests successful |
| 201 | Created | POST request successful |
| 400 | Bad Request | Invalid input (missing fields, bad JSON) |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Unique constraint violation (duplicate email) |
| 405 | Method Not Allowed | Wrong HTTP method |
| 500 | Server Error | Unhandled exception or database error |

---

## 🔧 Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `PORT` | 3000 | No | HTTP server port |
| `DATABASE_URL` | None | Yes | PostgreSQL connection string |

**Connection String Format**:
```
postgres://username:password@host:port/database?sslmode=disable
```

**Example**:
```
postgres://dev:dev@localhost:5432/person_service?sslmode=disable
```

---

## 📂 File Structure Reference

```
source/
├── main.go                    # Application entry point
├── go.mod                     # Go module config
├── go.sum                     # Dependency lock file
├── Dockerfile                 # Multi-stage Docker build
├── .dockerignore              # Docker exclusions
├── docker-compose.yml         # Local development setup
├── test-api.sh                # API test script
├── README.md                  # Full documentation
├── IMPLEMENTATION.md          # Implementation details
│
├── logic/
│   └── user.go               # Domain models & interfaces
├── dependencies/
│   └── postgres.go           # PostgreSQL repository
└── handlers/
    └── http.go               # HTTP handlers
```

---

## 🎯 Common Tasks

### Task: Add a new endpoint

1. **Define interface** in `logic/user.go` if needed
2. **Implement method** in `dependencies/postgres.go`
3. **Add handler** in `handlers/http.go`
4. **Register route** in `main.go`

### Task: Change database connection settings

Edit connection pool settings in `dependencies/postgres.go`:
```go
db.SetMaxOpenConns(25)     // Change connection limit
db.SetMaxIdleConns(5)      // Change idle limit
db.SetConnMaxLifetime(...)  // Change lifetime
```

### Task: Add validation

Add guard clauses in handler methods (early returns):
```go
if strings.TrimSpace(req.Email) == "" {
    h.ErrorResponse(w, http.StatusBadRequest, "email is required")
    return
}
```

### Task: Add logging

Use standard `log` package:
```go
log.Printf("INFO: User created: %d\n", user.ID)
log.Printf("ERROR: Failed to create user: %v\n", err)
```

---

## ⚠️ Troubleshooting

### "DATABASE_URL environment variable is not set"
- Set the DATABASE_URL before running the service
- Example: `export DATABASE_URL="postgres://..."`

### "Connection refused" error
- Ensure PostgreSQL is running on the correct host:port
- Check DATABASE_URL format

### "duplicate key value violates unique constraint"
- Email already exists in the database
- This returns HTTP 409 Conflict

### "user not found"
- The user ID doesn't exist in the database
- This returns HTTP 404 Not Found

### Port already in use
- Change PORT environment variable
- Example: `export PORT=3001`

---

## 📝 Response Format

All responses follow this format:

```json
{
  "status": 200,
  "data": { /* response data */ },
  "error": null
}
```

**Success Example**:
```json
{
  "status": 200,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "created_at": "2024-12-19T11:00:00Z"
  }
}
```

**Error Example**:
```json
{
  "status": 400,
  "error": "email is required"
}
```

---

## 🔐 Security Notes

- Service runs as non-root user in Docker
- Connection pooling prevents resource exhaustion
- Request timeouts prevent hung requests
- Input validation prevents injection attacks
- Use SSL in production (sslmode=require)

---

## 📚 File Line Counts

```
main.go              : ~100 lines  (Entry point, routing, server config)
logic/user.go        : ~50 lines   (Domain models, interfaces)
dependencies/postgres.go : ~150 lines (Database operations)
handlers/http.go     : ~250 lines  (HTTP handlers, responses)
Dockerfile           : ~35 lines   (Multi-stage build)
```

---

## ✨ Best Practices Implemented

✅ **Three-Layer Architecture**: Logic, Dependencies, I/O layers strictly separated
✅ **Dependency Inversion**: Logic defines interfaces, Dependencies implements them
✅ **Error Handling**: Comprehensive error handling with proper HTTP codes
✅ **Logging**: Structured logging for important events
✅ **Graceful Shutdown**: Proper signal handling and cleanup
✅ **Connection Pooling**: Efficient database connection management
✅ **Timeouts**: Request and idle timeouts configured
✅ **Docker**: Multi-stage build, minimal image, health checks
✅ **Security**: Non-root user, no hardcoded secrets
✅ **Documentation**: Comprehensive README and examples

---

**Last Updated**: December 19, 2024
**Go Version**: 1.21+
**PostgreSQL Version**: 12+
