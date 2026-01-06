package health

import (
	"testing"

	db "person-service/internal/db/generated"

	"github.com/stretchr/testify/assert"
)

// MockDB is a simple mock for the database queries
// In a real scenario, you'd use a mock generator or a simpler interface
type MockDB struct{}

func TestNewHealthCheckHandler(t *testing.T) {
	queries := &db.Queries{}
	handler := NewHealthCheckHandler(queries)
	assert.NotNil(t, handler)
	assert.Equal(t, queries, handler.queries)
}

// Note: TestCheck would normally require a mock of db.Queries
// Since db.Queries is a struct with methods, we'd need to mock the underlying DB or use an interface.
// For the sake of this demonstration, we'll keep it simple.
