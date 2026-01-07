package key_value

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"

	db "person-service/internal/db/generated"
)

// MockDBTX is a mock for db.DBTX interface
type MockDBTX struct {
	ExecFunc     func(context.Context, string, ...interface{}) (pgconn.CommandTag, error)
	QueryFunc    func(context.Context, string, ...interface{}) (pgx.Rows, error)
	QueryRowFunc func(context.Context, string, ...interface{}) pgx.Row
	CopyFromFunc func(ctx context.Context, tableName pgx.Identifier, columnNames []string, rowSrc pgx.CopyFromSource) (int64, error)
}

func (m *MockDBTX) Exec(ctx context.Context, sql string, arguments ...interface{}) (pgconn.CommandTag, error) {
	if m.ExecFunc != nil {
		return m.ExecFunc(ctx, sql, arguments...)
	}
	return pgconn.CommandTag{}, nil
}

func (m *MockDBTX) Query(ctx context.Context, sql string, arguments ...interface{}) (pgx.Rows, error) {
	if m.QueryFunc != nil {
		return m.QueryFunc(ctx, sql, arguments...)
	}
	return nil, nil
}

func (m *MockDBTX) QueryRow(ctx context.Context, sql string, arguments ...interface{}) pgx.Row {
	if m.QueryRowFunc != nil {
		return m.QueryRowFunc(ctx, sql, arguments...)
	}
	return nil
}

func (m *MockDBTX) CopyFrom(ctx context.Context, tableName pgx.Identifier, columnNames []string, rowSrc pgx.CopyFromSource) (int64, error) {
	if m.CopyFromFunc != nil {
		return m.CopyFromFunc(ctx, tableName, columnNames, rowSrc)
	}
	return 0, nil
}

// MockRow is a mock for pgx.Row interface
type MockRow struct {
	ScanFunc func(dest ...interface{}) error
}

func (m *MockRow) Scan(dest ...interface{}) error {
	if m.ScanFunc != nil {
		return m.ScanFunc(dest...)
	}
	return nil
}

func TestNewKeyValueHandler(t *testing.T) {
	mockDB := &MockDBTX{}
	queries := db.New(mockDB)
	handler := NewKeyValueHandler(queries)
	assert.NotNil(t, handler)
	assert.Equal(t, queries, handler.queries)
}

func TestSetValue_Success(t *testing.T) {
	mockDB := &MockDBTX{
		ExecFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgconn.CommandTag, error) {
			return pgconn.CommandTag{}, nil
		},
		QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
			return &MockRow{
				ScanFunc: func(dest ...interface{}) error {
					if len(dest) >= 4 {
						// key, value, created_at, updated_at
						*dest[0].(*string) = "test-key"
						*dest[1].(*string) = "test-value"
						*dest[2].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true}
						*dest[3].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true}
					}
					return nil
				},
			}
		},
	}

	queries := db.New(mockDB)
	handler := NewKeyValueHandler(queries)

	e := echo.New()
	jsonBody := `{"key":"test-key","value":"test-value"}`
	req := httptest.NewRequest(http.MethodPost, "/api/key-value", strings.NewReader(jsonBody))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := handler.SetValue(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Contains(t, rec.Body.String(), "test-key")
	assert.Contains(t, rec.Body.String(), "test-value")
}

func TestSetValue_InvalidJSON(t *testing.T) {
	mockDB := &MockDBTX{}
	queries := db.New(mockDB)
	handler := NewKeyValueHandler(queries)

	e := echo.New()
	jsonBody := `{invalid-json}`
	req := httptest.NewRequest(http.MethodPost, "/api/key-value", strings.NewReader(jsonBody))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := handler.SetValue(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "Invalid request body")
}

func TestSetValue_EmptyKey(t *testing.T) {
	mockDB := &MockDBTX{}
	queries := db.New(mockDB)
	handler := NewKeyValueHandler(queries)

	e := echo.New()
	jsonBody := `{"key":"","value":"test-value"}`
	req := httptest.NewRequest(http.MethodPost, "/api/key-value", strings.NewReader(jsonBody))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := handler.SetValue(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "Key and value are required")
}

func TestSetValue_EmptyValue(t *testing.T) {
	mockDB := &MockDBTX{}
	queries := db.New(mockDB)
	handler := NewKeyValueHandler(queries)

	e := echo.New()
	jsonBody := `{"key":"test-key","value":""}`
	req := httptest.NewRequest(http.MethodPost, "/api/key-value", strings.NewReader(jsonBody))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := handler.SetValue(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "Key and value are required")
}

func TestSetValue_DatabaseErrorOnSet(t *testing.T) {
	mockDB := &MockDBTX{
		ExecFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgconn.CommandTag, error) {
			return pgconn.CommandTag{}, errors.New("database error")
		},
	}

	queries := db.New(mockDB)
	handler := NewKeyValueHandler(queries)

	e := echo.New()
	jsonBody := `{"key":"test-key","value":"test-value"}`
	req := httptest.NewRequest(http.MethodPost, "/api/key-value", strings.NewReader(jsonBody))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := handler.SetValue(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusInternalServerError, rec.Code)
	assert.Contains(t, rec.Body.String(), "Failed to set value")
}

func TestSetValue_DatabaseErrorOnGet(t *testing.T) {
	mockDB := &MockDBTX{
		ExecFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgconn.CommandTag, error) {
			return pgconn.CommandTag{}, nil
		},
		QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
			return &MockRow{
				ScanFunc: func(dest ...interface{}) error {
					return errors.New("database error")
				},
			}
		},
	}

	queries := db.New(mockDB)
	handler := NewKeyValueHandler(queries)

	e := echo.New()
	jsonBody := `{"key":"test-key","value":"test-value"}`
	req := httptest.NewRequest(http.MethodPost, "/api/key-value", strings.NewReader(jsonBody))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := handler.SetValue(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusInternalServerError, rec.Code)
	assert.Contains(t, rec.Body.String(), "Failed to retrieve value")
}

func TestGetValue_Success(t *testing.T) {
	mockDB := &MockDBTX{
		QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
			return &MockRow{
				ScanFunc: func(dest ...interface{}) error {
					if len(dest) >= 4 {
						*dest[0].(*string) = "test-key"
						*dest[1].(*string) = "test-value"
						*dest[2].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true}
						*dest[3].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true}
					}
					return nil
				},
			}
		},
	}

	queries := db.New(mockDB)
	handler := NewKeyValueHandler(queries)

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/key-value/test-key", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("key")
	c.SetParamValues("test-key")

	err := handler.GetValue(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Contains(t, rec.Body.String(), "test-key")
	assert.Contains(t, rec.Body.String(), "test-value")
}

func TestGetValue_EmptyKey(t *testing.T) {
	mockDB := &MockDBTX{}
	queries := db.New(mockDB)
	handler := NewKeyValueHandler(queries)

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/key-value/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("key")
	c.SetParamValues("")

	err := handler.GetValue(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "Key parameter is required")
}

func TestGetValue_KeyNotFound(t *testing.T) {
	mockDB := &MockDBTX{
		QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
			return &MockRow{
				ScanFunc: func(dest ...interface{}) error {
					return sql.ErrNoRows
				},
			}
		},
	}

	queries := db.New(mockDB)
	handler := NewKeyValueHandler(queries)

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/key-value/nonexistent", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("key")
	c.SetParamValues("nonexistent")

	err := handler.GetValue(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, rec.Code)
	assert.Contains(t, rec.Body.String(), "Key not found")
}

func TestGetValue_DatabaseError(t *testing.T) {
	mockDB := &MockDBTX{
		QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
			return &MockRow{
				ScanFunc: func(dest ...interface{}) error {
					return errors.New("database error")
				},
			}
		},
	}

	queries := db.New(mockDB)
	handler := NewKeyValueHandler(queries)

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/key-value/test-key", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("key")
	c.SetParamValues("test-key")

	err := handler.GetValue(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusInternalServerError, rec.Code)
	assert.Contains(t, rec.Body.String(), "Failed to retrieve value")
}

func TestDeleteValue_Success(t *testing.T) {
	mockDB := &MockDBTX{
		ExecFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgconn.CommandTag, error) {
			return pgconn.CommandTag{}, nil
		},
	}

	queries := db.New(mockDB)
	handler := NewKeyValueHandler(queries)

	e := echo.New()
	req := httptest.NewRequest(http.MethodDelete, "/api/key-value/test-key", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("key")
	c.SetParamValues("test-key")

	err := handler.DeleteValue(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Contains(t, rec.Body.String(), "Key deleted successfully")
}

func TestDeleteValue_EmptyKey(t *testing.T) {
	mockDB := &MockDBTX{}
	queries := db.New(mockDB)
	handler := NewKeyValueHandler(queries)

	e := echo.New()
	req := httptest.NewRequest(http.MethodDelete, "/api/key-value/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("key")
	c.SetParamValues("")

	err := handler.DeleteValue(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "Key parameter is required")
}

func TestDeleteValue_DatabaseError(t *testing.T) {
	mockDB := &MockDBTX{
		ExecFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgconn.CommandTag, error) {
			return pgconn.CommandTag{}, errors.New("database error")
		},
	}

	queries := db.New(mockDB)
	handler := NewKeyValueHandler(queries)

	e := echo.New()
	req := httptest.NewRequest(http.MethodDelete, "/api/key-value/test-key", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("key")
	c.SetParamValues("test-key")

	err := handler.DeleteValue(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusInternalServerError, rec.Code)
	assert.Contains(t, rec.Body.String(), "Failed to delete value")
}
