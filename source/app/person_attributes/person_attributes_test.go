package person_attributes

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
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

func (m *MockDBTX) Exec(ctx context.Context, query string, arguments ...interface{}) (pgconn.CommandTag, error) {
	if m.ExecFunc != nil {
		return m.ExecFunc(ctx, query, arguments...)
	}
	return pgconn.CommandTag{}, nil
}

func (m *MockDBTX) Query(ctx context.Context, query string, arguments ...interface{}) (pgx.Rows, error) {
	if m.QueryFunc != nil {
		return m.QueryFunc(ctx, query, arguments...)
	}
	return nil, nil
}

func (m *MockDBTX) QueryRow(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
	if m.QueryRowFunc != nil {
		return m.QueryRowFunc(ctx, query, arguments...)
	}
	return nil
}

func (m *MockDBTX) CopyFrom(ctx context.Context, tableName pgx.Identifier, columnNames []string, rowSrc pgx.CopyFromSource) (int64, error) {
	if m.CopyFromFunc != nil {
		return m.CopyFromFunc(ctx, tableName, columnNames, rowSrc)
	}
	return 0, nil
}

func TestNewPersonAttributesHandler(t *testing.T) {
	mockDB := &MockDBTX{}
	queries := db.New(mockDB)
	handler := NewPersonAttributesHandler(queries)
	assert.NotNil(t, handler)
	assert.Equal(t, queries, handler.queries)
	assert.Equal(t, "default-key-for-dev", handler.encryptionKey)
	assert.Equal(t, int32(1), handler.keyVersion)
}

func TestNewPersonAttributesHandler_WithEnvVar(t *testing.T) {
	// Set environment variable
	os.Setenv("ENCRYPTION_KEY_1", "test-key")
	defer os.Unsetenv("ENCRYPTION_KEY_1")

	mockDB := &MockDBTX{}
	queries := db.New(mockDB)
	handler := NewPersonAttributesHandler(queries)
	assert.NotNil(t, handler)
	assert.Equal(t, "test-key", handler.encryptionKey)
}

func TestCreateAttribute_InvalidUUID(t *testing.T) {
	mockDB := &MockDBTX{}
	queries := db.New(mockDB)
	handler := NewPersonAttributesHandler(queries)

	e := echo.New()
	jsonBody := `{"key":"email","value":"test@example.com","meta":{"caller":"test","reason":"testing","traceId":"123"}}`
	req := httptest.NewRequest(http.MethodPut, "/persons/invalid-uuid/attributes", strings.NewReader(jsonBody))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("personId")
	c.SetParamValues("invalid-uuid")

	err := handler.CreateAttribute(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, rec.Code)
	assert.Contains(t, rec.Body.String(), "Person not found")
}

func TestCreateAttribute_InvalidJSON(t *testing.T) {
	mockDB := &MockDBTX{}
	queries := db.New(mockDB)
	handler := NewPersonAttributesHandler(queries)

	e := echo.New()
	jsonBody := `{invalid-json}`
	req := httptest.NewRequest(http.MethodPut, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes", strings.NewReader(jsonBody))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("personId")
	c.SetParamValues("123e4567-e89b-12d3-a456-426614174000")

	err := handler.CreateAttribute(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "Invalid request body")
}

func TestCreateAttribute_EmptyKey(t *testing.T) {
	mockDB := &MockDBTX{}
	queries := db.New(mockDB)
	handler := NewPersonAttributesHandler(queries)

	e := echo.New()
	jsonBody := `{"key":"","value":"test@example.com","meta":{"caller":"test","reason":"testing","traceId":"123"}}`
	req := httptest.NewRequest(http.MethodPut, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes", strings.NewReader(jsonBody))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("personId")
	c.SetParamValues("123e4567-e89b-12d3-a456-426614174000")

	err := handler.CreateAttribute(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "Key is required")
}

func TestCreateAttribute_MissingMeta(t *testing.T) {
	mockDB := &MockDBTX{}
	queries := db.New(mockDB)
	handler := NewPersonAttributesHandler(queries)

	e := echo.New()
	jsonBody := `{"key":"email","value":"test@example.com"}`
	req := httptest.NewRequest(http.MethodPut, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes", strings.NewReader(jsonBody))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("personId")
	c.SetParamValues("123e4567-e89b-12d3-a456-426614174000")

	err := handler.CreateAttribute(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "Missing required field")
}

func TestGetAllAttributes_InvalidUUID(t *testing.T) {
	mockDB := &MockDBTX{}
	queries := db.New(mockDB)
	handler := NewPersonAttributesHandler(queries)

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/persons/invalid-uuid/attributes", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("personId")
	c.SetParamValues("invalid-uuid")

	err := handler.GetAllAttributes(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, rec.Code)
	assert.Contains(t, rec.Body.String(), "Person not found")
}

func TestGetAttribute_InvalidPersonUUID(t *testing.T) {
	mockDB := &MockDBTX{}
	queries := db.New(mockDB)
	handler := NewPersonAttributesHandler(queries)

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/persons/invalid-uuid/attributes/1", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("personId", "attributeId")
	c.SetParamValues("invalid-uuid", "1")

	err := handler.GetAttribute(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "Invalid person ID format")
}

func TestGetAttribute_InvalidAttributeID(t *testing.T) {
	mockDB := &MockDBTX{}
	queries := db.New(mockDB)
	handler := NewPersonAttributesHandler(queries)

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes/invalid", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("personId", "attributeId")
	c.SetParamValues("123e4567-e89b-12d3-a456-426614174000", "invalid")

	err := handler.GetAttribute(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "Invalid attribute ID format")
}

func TestUpdateAttribute_InvalidPersonUUID(t *testing.T) {
	mockDB := &MockDBTX{}
	queries := db.New(mockDB)
	handler := NewPersonAttributesHandler(queries)

	e := echo.New()
	jsonBody := `{"value":"updated@example.com"}`
	req := httptest.NewRequest(http.MethodPut, "/persons/invalid-uuid/attributes/1", strings.NewReader(jsonBody))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("personId", "attributeId")
	c.SetParamValues("invalid-uuid", "1")

	err := handler.UpdateAttribute(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "Invalid person ID format")
}

func TestUpdateAttribute_InvalidAttributeID(t *testing.T) {
	mockDB := &MockDBTX{}
	queries := db.New(mockDB)
	handler := NewPersonAttributesHandler(queries)

	e := echo.New()
	jsonBody := `{"value":"updated@example.com"}`
	req := httptest.NewRequest(http.MethodPut, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes/invalid", strings.NewReader(jsonBody))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("personId", "attributeId")
	c.SetParamValues("123e4567-e89b-12d3-a456-426614174000", "invalid")

	err := handler.UpdateAttribute(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "Invalid attribute ID format")
}

func TestUpdateAttribute_InvalidJSON(t *testing.T) {
	mockDB := &MockDBTX{}
	queries := db.New(mockDB)
	handler := NewPersonAttributesHandler(queries)

	e := echo.New()
	jsonBody := `{invalid-json}`
	req := httptest.NewRequest(http.MethodPut, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes/1", strings.NewReader(jsonBody))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("personId", "attributeId")
	c.SetParamValues("123e4567-e89b-12d3-a456-426614174000", "1")

	err := handler.UpdateAttribute(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "Invalid request body")
}

func TestDeleteAttribute_InvalidPersonUUID(t *testing.T) {
	mockDB := &MockDBTX{}
	queries := db.New(mockDB)
	handler := NewPersonAttributesHandler(queries)

	e := echo.New()
	req := httptest.NewRequest(http.MethodDelete, "/persons/invalid-uuid/attributes/1", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("personId", "attributeId")
	c.SetParamValues("invalid-uuid", "1")

	err := handler.DeleteAttribute(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "Invalid person ID format")
}

func TestDeleteAttribute_InvalidAttributeID(t *testing.T) {
	mockDB := &MockDBTX{}
	queries := db.New(mockDB)
	handler := NewPersonAttributesHandler(queries)

	e := echo.New()
	req := httptest.NewRequest(http.MethodDelete, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes/invalid", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetParamNames("personId", "attributeId")
	c.SetParamValues("123e4567-e89b-12d3-a456-426614174000", "invalid")

	err := handler.DeleteAttribute(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "Invalid attribute ID format")
}
