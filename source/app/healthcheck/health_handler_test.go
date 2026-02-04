package health

import (
	"context"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"

	db "person-service/internal/db/generated"
	"person-service/internal/testdb"
)

var pool *pgxpool.Pool

func TestMain(m *testing.M) {
	ctx := context.Background()
	var err error
	pool, err = testdb.GetPool(ctx)
	if err != nil {
		log.Fatalf("Failed to get pool: %v", err)
	}
	if err := testdb.RunMigrations(ctx, pool); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}
	os.Exit(m.Run())
}

func TestNewHealthCheckHandler(t *testing.T) {
	queries := db.New(pool)
	handler := NewHealthCheckHandler(queries)
	assert.NotNil(t, handler)
	assert.Equal(t, queries, handler.queries)
}

func TestCheck_Success(t *testing.T) {
	ctx := context.Background()
	err := testdb.TruncateTables(ctx, pool)
	assert.NoError(t, err)

	queries := db.New(pool)
	handler := NewHealthCheckHandler(queries)

	// Setup Echo
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	// Execute
	err = handler.Check(c)

	// Assert success case with explicit status check
	assert.NoError(t, err)
	// CRITICAL: When database is healthy, MUST return 200, not 500
	if rec.Code != http.StatusOK {
		t.Fatalf("Expected status 200 OK for healthy database, got %d: %s", rec.Code, rec.Body.String())
	}
	assert.Contains(t, rec.Body.String(), "healthy", "Response must contain 'healthy'")
	// Explicit check: NOT an error response
	assert.NotContains(t, rec.Body.String(), "HC_001", "Should not return error code for healthy DB")
	assert.NotContains(t, rec.Body.String(), "errorCode", "Should not contain error fields for healthy DB")
}

func TestCheck_DatabaseError(t *testing.T) {
	// Create a handler with a closed pool to simulate database error
	closedPool, err := createClosedPool()
	assert.NoError(t, err)

	queries := db.New(closedPool)
	handler := NewHealthCheckHandler(queries)

	// Setup Echo
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	// Execute
	err = handler.Check(c)

	// Assert error case with explicit status check
	assert.NoError(t, err)
	// CRITICAL: When database has error, MUST return 500, not 200
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("Expected status 500 Internal Server Error for failed database, got %d: %s", rec.Code, rec.Body.String())
	}
	assert.Contains(t, rec.Body.String(), "HC_001_HEALTH_CHECK_FAILED")
	// Verify it's NOT a healthy response
	assert.NotContains(t, rec.Body.String(), `"status":"healthy"`, "Should not return healthy for failed DB")
}

// TestCheck_HealthyVsUnhealthy explicitly tests that healthy DB gets 200 and unhealthy gets 500
func TestCheck_HealthyVsUnhealthy(t *testing.T) {
	t.Run("healthy DB returns 200", func(t *testing.T) {
		queries := db.New(pool)
		handler := NewHealthCheckHandler(queries)

		e := echo.New()
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		handler.Check(c)

		// Must be exactly 200 for healthy
		if rec.Code == http.StatusInternalServerError {
			t.Fatal("BUG: Healthy database should NOT return 500")
		}
		if rec.Code != http.StatusOK {
			t.Fatalf("Healthy database must return 200, got %d", rec.Code)
		}
	})

	t.Run("unhealthy DB returns 500", func(t *testing.T) {
		closedPool, _ := createClosedPool()
		queries := db.New(closedPool)
		handler := NewHealthCheckHandler(queries)

		e := echo.New()
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		handler.Check(c)

		// Must be exactly 500 for unhealthy
		if rec.Code == http.StatusOK {
			t.Fatal("BUG: Unhealthy database should NOT return 200")
		}
		if rec.Code != http.StatusInternalServerError {
			t.Fatalf("Unhealthy database must return 500, got %d", rec.Code)
		}
	})
}

// createClosedPool creates a pool and immediately closes it to simulate database errors
func createClosedPool() (*pgxpool.Pool, error) {
	ctx := context.Background()
	connStr, err := testdb.GetConnectionString(ctx)
	if err != nil {
		return nil, err
	}

	config, err := pgxpool.ParseConfig(connStr)
	if err != nil {
		return nil, err
	}

	closedPool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, err
	}

	// Close the pool immediately
	closedPool.Close()

	return closedPool, nil
}
