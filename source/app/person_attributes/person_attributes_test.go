package person_attributes

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
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

func TestCreateAttribute_PersonNotFound(t *testing.T) {
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
handler := NewPersonAttributesHandler(queries)

e := echo.New()
jsonBody := `{"key":"email","value":"test@example.com","meta":{"caller":"test","reason":"testing","traceId":"123"}}`
req := httptest.NewRequest(http.MethodPut, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes", strings.NewReader(jsonBody))
req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000")

err := handler.CreateAttribute(c)

assert.NoError(t, err)
// Should be either not found or internal error depending on error type
assert.Equal(t, http.StatusNotFound, rec.Code)
}

func TestGetAllAttributes_PersonNotFound(t *testing.T) {
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
handler := NewPersonAttributesHandler(queries)

e := echo.New()
req := httptest.NewRequest(http.MethodGet, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes", nil)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000")

err := handler.GetAllAttributes(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusNotFound, rec.Code)
}

func TestGetAttribute_PersonNotFound(t *testing.T) {
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
handler := NewPersonAttributesHandler(queries)

e := echo.New()
req := httptest.NewRequest(http.MethodGet, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes/1", nil)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId", "attributeId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000", "1")

err := handler.GetAttribute(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusNotFound, rec.Code)
}

func TestUpdateAttribute_PersonNotFound(t *testing.T) {
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
handler := NewPersonAttributesHandler(queries)

e := echo.New()
jsonBody := `{"value":"updated@example.com"}`
req := httptest.NewRequest(http.MethodPut, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes/1", strings.NewReader(jsonBody))
req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId", "attributeId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000", "1")

err := handler.UpdateAttribute(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusNotFound, rec.Code)
}

func TestDeleteAttribute_PersonNotFound(t *testing.T) {
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
handler := NewPersonAttributesHandler(queries)

e := echo.New()
req := httptest.NewRequest(http.MethodDelete, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes/1", nil)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId", "attributeId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000", "1")

err := handler.DeleteAttribute(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusNotFound, rec.Code)
}

func TestCreateAttribute_SuccessWithoutTraceID(t *testing.T) {
personID := pgtype.UUID{}
personID.Scan("123e4567-e89b-12d3-a456-426614174000")

callCount := 0
mockDB := &MockDBTX{
QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
callCount++
if callCount == 1 {
// GetPersonById - return person exists
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
return nil
},
}
} else if callCount == 2 {
// CreateOrUpdatePersonAttribute - return created attribute
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
*dest[0].(*int32) = 1                          // id
*dest[1].(*pgtype.UUID) = personID             // person_id
*dest[2].(*string) = "email"                   // attribute_key
*dest[3].(*int32) = 1                          // key_version
*dest[4].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true} // created_at
*dest[5].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true} // updated_at
return nil
},
}
} else {
// GetPersonAttribute - return the full attribute with value
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
*dest[0].(*int32) = 1                          // id
*dest[1].(*pgtype.UUID) = personID             // person_id
*dest[2].(*string) = "email"                   // attribute_key
*dest[3].(*string) = "test@example.com"        // attribute_value
*dest[4].(*int32) = 1                          // key_version
*dest[5].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true} // created_at
*dest[6].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true} // updated_at
return nil
},
}
}
},
ExecFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgconn.CommandTag, error) {
return pgconn.CommandTag{}, nil
},
}

queries := db.New(mockDB)
handler := NewPersonAttributesHandler(queries)

e := echo.New()
jsonBody := `{"key":"email","value":"test@example.com","meta":{"caller":"test","reason":"testing"}}`
req := httptest.NewRequest(http.MethodPut, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes", strings.NewReader(jsonBody))
req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000")

err := handler.CreateAttribute(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusCreated, rec.Code)
assert.Contains(t, rec.Body.String(), "email")
}

// MockRows for Query results
type MockRows struct {
rows [][]interface{}
idx  int
}

func (m *MockRows) Close() {}

func (m *MockRows) Err() error {
return nil
}

func (m *MockRows) CommandTag() pgconn.CommandTag {
return pgconn.CommandTag{}
}

func (m *MockRows) FieldDescriptions() []pgconn.FieldDescription {
return nil
}

func (m *MockRows) Next() bool {
if m.idx < len(m.rows) {
m.idx++
return true
}
return false
}

func (m *MockRows) Scan(dest ...interface{}) error {
if m.idx == 0 || m.idx > len(m.rows) {
return errors.New("no rows")
}
row := m.rows[m.idx-1]
for i := range dest {
if i < len(row) {
switch d := dest[i].(type) {
case *int32:
*d = row[i].(int32)
case *string:
*d = row[i].(string)
case *pgtype.UUID:
*d = row[i].(pgtype.UUID)
case *pgtype.Timestamp:
*d = row[i].(pgtype.Timestamp)
}
}
}
return nil
}

func (m *MockRows) Values() ([]interface{}, error) {
return nil, nil
}

func (m *MockRows) RawValues() [][]byte {
return nil
}

func (m *MockRows) Conn() *pgx.Conn {
return nil
}

func TestGetAllAttributes_Success(t *testing.T) {
personID := pgtype.UUID{}
personID.Scan("123e4567-e89b-12d3-a456-426614174000")

mockDB := &MockDBTX{
QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
// GetPersonById - return person exists
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
return nil
},
}
},
QueryFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgx.Rows, error) {
// Return empty rows (no attributes)
return &MockRows{rows: [][]interface{}{}}, nil
},
}

queries := db.New(mockDB)
handler := NewPersonAttributesHandler(queries)

e := echo.New()
req := httptest.NewRequest(http.MethodGet, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes", nil)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000")

err := handler.GetAllAttributes(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusOK, rec.Code)
}

func TestGetAttribute_NotFound(t *testing.T) {
personID := pgtype.UUID{}
personID.Scan("123e4567-e89b-12d3-a456-426614174000")

mockDB := &MockDBTX{
QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
// GetPersonById - return person exists
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
return nil
},
}
},
QueryFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgx.Rows, error) {
// Return empty rows (no attributes)
return &MockRows{rows: [][]interface{}{}}, nil
},
}

queries := db.New(mockDB)
handler := NewPersonAttributesHandler(queries)

e := echo.New()
req := httptest.NewRequest(http.MethodGet, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes/999", nil)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId", "attributeId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000", "999")

err := handler.GetAttribute(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusNotFound, rec.Code)
assert.Contains(t, rec.Body.String(), "Attribute not found")
}

func TestUpdateAttribute_NotFound(t *testing.T) {
personID := pgtype.UUID{}
personID.Scan("123e4567-e89b-12d3-a456-426614174000")

mockDB := &MockDBTX{
QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
// GetPersonById - return person exists
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
return nil
},
}
},
QueryFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgx.Rows, error) {
// Return empty rows (no attributes)
return &MockRows{rows: [][]interface{}{}}, nil
},
}

queries := db.New(mockDB)
handler := NewPersonAttributesHandler(queries)

e := echo.New()
jsonBody := `{"value":"updated@example.com"}`
req := httptest.NewRequest(http.MethodPut, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes/999", strings.NewReader(jsonBody))
req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId", "attributeId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000", "999")

err := handler.UpdateAttribute(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusNotFound, rec.Code)
assert.Contains(t, rec.Body.String(), "Attribute not found")
}

func TestDeleteAttribute_NotFound(t *testing.T) {
personID := pgtype.UUID{}
personID.Scan("123e4567-e89b-12d3-a456-426614174000")

mockDB := &MockDBTX{
QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
// GetPersonById - return person exists
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
return nil
},
}
},
QueryFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgx.Rows, error) {
// Return empty rows (no attributes)
return &MockRows{rows: [][]interface{}{}}, nil
},
}

queries := db.New(mockDB)
handler := NewPersonAttributesHandler(queries)

e := echo.New()
req := httptest.NewRequest(http.MethodDelete, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes/999", nil)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId", "attributeId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000", "999")

err := handler.DeleteAttribute(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusNotFound, rec.Code)
assert.Contains(t, rec.Body.String(), "Attribute not found")
}

func TestGetAllAttributes_DatabaseError(t *testing.T) {
mockDB := &MockDBTX{
QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
return nil
},
}
},
QueryFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgx.Rows, error) {
return nil, errors.New("database error")
},
}

queries := db.New(mockDB)
handler := NewPersonAttributesHandler(queries)

e := echo.New()
req := httptest.NewRequest(http.MethodGet, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes", nil)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000")

err := handler.GetAllAttributes(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusInternalServerError, rec.Code)
assert.Contains(t, rec.Body.String(), "Failed to retrieve attributes")
}

func TestGetAttribute_DatabaseError(t *testing.T) {
mockDB := &MockDBTX{
QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
return nil
},
}
},
QueryFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgx.Rows, error) {
return nil, errors.New("database error")
},
}

queries := db.New(mockDB)
handler := NewPersonAttributesHandler(queries)

e := echo.New()
req := httptest.NewRequest(http.MethodGet, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes/1", nil)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId", "attributeId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000", "1")

err := handler.GetAttribute(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusInternalServerError, rec.Code)
assert.Contains(t, rec.Body.String(), "Failed to retrieve attributes")
}

func TestUpdateAttribute_DatabaseError(t *testing.T) {
mockDB := &MockDBTX{
QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
return nil
},
}
},
QueryFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgx.Rows, error) {
return nil, errors.New("database error")
},
}

queries := db.New(mockDB)
handler := NewPersonAttributesHandler(queries)

e := echo.New()
jsonBody := `{"value":"updated@example.com"}`
req := httptest.NewRequest(http.MethodPut, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes/1", strings.NewReader(jsonBody))
req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId", "attributeId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000", "1")

err := handler.UpdateAttribute(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusInternalServerError, rec.Code)
assert.Contains(t, rec.Body.String(), "Failed to retrieve attributes")
}

func TestDeleteAttribute_DatabaseError(t *testing.T) {
mockDB := &MockDBTX{
QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
return nil
},
}
},
QueryFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgx.Rows, error) {
return nil, errors.New("database error")
},
}

queries := db.New(mockDB)
handler := NewPersonAttributesHandler(queries)

e := echo.New()
req := httptest.NewRequest(http.MethodDelete, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes/1", nil)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId", "attributeId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000", "1")

err := handler.DeleteAttribute(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusInternalServerError, rec.Code)
assert.Contains(t, rec.Body.String(), "Failed to retrieve attributes")
}

func TestUpdateAttribute_Success(t *testing.T) {
personID := pgtype.UUID{}
personID.Scan("123e4567-e89b-12d3-a456-426614174000")

callCount := 0
mockDB := &MockDBTX{
QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
callCount++
if callCount <= 2 {
// GetPersonById and CreateOrUpdatePersonAttribute
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
if callCount == 2 {
// CreateOrUpdatePersonAttribute
*dest[0].(*int32) = 1
*dest[1].(*pgtype.UUID) = personID
*dest[2].(*string) = "email"
*dest[3].(*int32) = 1
*dest[4].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true}
*dest[5].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true}
}
return nil
},
}
}
// GetPersonAttribute
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
*dest[0].(*int32) = 1
*dest[1].(*pgtype.UUID) = personID
*dest[2].(*string) = "email"
*dest[3].(*string) = "updated@example.com"
*dest[4].(*int32) = 1
*dest[5].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true}
*dest[6].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true}
return nil
},
}
},
QueryFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgx.Rows, error) {
// Return one attribute
return &MockRows{
rows: [][]interface{}{
{int32(1), personID, "email", "test@example.com", int32(1), pgtype.Timestamp{Valid: true}, pgtype.Timestamp{Valid: true}},
},
}, nil
},
ExecFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgconn.CommandTag, error) {
return pgconn.CommandTag{}, nil
},
}

queries := db.New(mockDB)
handler := NewPersonAttributesHandler(queries)

e := echo.New()
jsonBody := `{"value":"updated@example.com"}`
req := httptest.NewRequest(http.MethodPut, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes/1", strings.NewReader(jsonBody))
req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId", "attributeId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000", "1")

err := handler.UpdateAttribute(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusOK, rec.Code)
}

func TestUpdateAttribute_WithKeyChange(t *testing.T) {
personID := pgtype.UUID{}
personID.Scan("123e4567-e89b-12d3-a456-426614174000")

callCount := 0
mockDB := &MockDBTX{
QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
callCount++
if callCount <= 2 {
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
if callCount == 2 {
*dest[0].(*int32) = 1
*dest[1].(*pgtype.UUID) = personID
*dest[2].(*string) = "newkey"
*dest[3].(*int32) = 1
*dest[4].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true}
*dest[5].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true}
}
return nil
},
}
}
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
*dest[0].(*int32) = 1
*dest[1].(*pgtype.UUID) = personID
*dest[2].(*string) = "newkey"
*dest[3].(*string) = "updated@example.com"
*dest[4].(*int32) = 1
*dest[5].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true}
*dest[6].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true}
return nil
},
}
},
QueryFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgx.Rows, error) {
return &MockRows{
rows: [][]interface{}{
{int32(1), personID, "oldkey", "old@example.com", int32(1), pgtype.Timestamp{Valid: true}, pgtype.Timestamp{Valid: true}},
},
}, nil
},
ExecFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgconn.CommandTag, error) {
return pgconn.CommandTag{}, nil
},
}

queries := db.New(mockDB)
handler := NewPersonAttributesHandler(queries)

e := echo.New()
jsonBody := `{"key":"newkey","value":"updated@example.com"}`
req := httptest.NewRequest(http.MethodPut, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes/1", strings.NewReader(jsonBody))
req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId", "attributeId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000", "1")

err := handler.UpdateAttribute(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusOK, rec.Code)
}

func TestDeleteAttribute_Success(t *testing.T) {
personID := pgtype.UUID{}
personID.Scan("123e4567-e89b-12d3-a456-426614174000")

mockDB := &MockDBTX{
QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
return nil
},
}
},
QueryFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgx.Rows, error) {
return &MockRows{
rows: [][]interface{}{
{int32(1), personID, "email", "test@example.com", int32(1), pgtype.Timestamp{Valid: true}, pgtype.Timestamp{Valid: true}},
},
}, nil
},
ExecFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgconn.CommandTag, error) {
return pgconn.CommandTag{}, nil
},
}

queries := db.New(mockDB)
handler := NewPersonAttributesHandler(queries)

e := echo.New()
req := httptest.NewRequest(http.MethodDelete, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes/1", nil)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId", "attributeId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000", "1")

err := handler.DeleteAttribute(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusOK, rec.Code)
assert.Contains(t, rec.Body.String(), "Attribute deleted successfully")
}

func TestGetAttribute_Success(t *testing.T) {
personID := pgtype.UUID{}
personID.Scan("123e4567-e89b-12d3-a456-426614174000")

mockDB := &MockDBTX{
QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
return nil
},
}
},
QueryFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgx.Rows, error) {
return &MockRows{
rows: [][]interface{}{
{int32(1), personID, "email", "test@example.com", int32(1), pgtype.Timestamp{Valid: true}, pgtype.Timestamp{Valid: true}},
},
}, nil
},
}

queries := db.New(mockDB)
handler := NewPersonAttributesHandler(queries)

e := echo.New()
req := httptest.NewRequest(http.MethodGet, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes/1", nil)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId", "attributeId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000", "1")

err := handler.GetAttribute(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusOK, rec.Code)
}

func TestGetAllAttributes_WithResults(t *testing.T) {
personID := pgtype.UUID{}
personID.Scan("123e4567-e89b-12d3-a456-426614174000")

mockDB := &MockDBTX{
QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
return nil
},
}
},
QueryFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgx.Rows, error) {
return &MockRows{
rows: [][]interface{}{
{int32(1), personID, "email", "test@example.com", int32(1), pgtype.Timestamp{Valid: true}, pgtype.Timestamp{Valid: true}},
{int32(2), personID, "phone", "+1234567890", int32(1), pgtype.Timestamp{Valid: true}, pgtype.Timestamp{Valid: true}},
},
}, nil
},
}

queries := db.New(mockDB)
handler := NewPersonAttributesHandler(queries)

e := echo.New()
req := httptest.NewRequest(http.MethodGet, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes", nil)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000")

err := handler.GetAllAttributes(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusOK, rec.Code)
}

func TestCreateAttribute_SuccessWithTraceID(t *testing.T) {
personID := pgtype.UUID{}
personID.Scan("123e4567-e89b-12d3-a456-426614174000")

callCount := 0
mockDB := &MockDBTX{
QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
callCount++
if callCount == 1 {
// GetPersonById
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
return nil
},
}
} else if callCount == 2 {
// CreateOrUpdatePersonAttribute
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
*dest[0].(*int32) = 1
*dest[1].(*pgtype.UUID) = personID
*dest[2].(*string) = "email"
*dest[3].(*int32) = 1
*dest[4].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true}
*dest[5].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true}
return nil
},
}
} else if callCount == 3 {
// InsertRequestLog
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
*dest[0].(*int32) = 1
*dest[1].(*string) = "trace123"
*dest[2].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true}
return nil
},
}
} else {
// GetPersonAttribute
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
*dest[0].(*int32) = 1
*dest[1].(*pgtype.UUID) = personID
*dest[2].(*string) = "email"
*dest[3].(*string) = "test@example.com"
*dest[4].(*int32) = 1
*dest[5].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true}
*dest[6].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true}
return nil
},
}
}
},
}

queries := db.New(mockDB)
handler := NewPersonAttributesHandler(queries)

e := echo.New()
jsonBody := `{"key":"email","value":"test@example.com","meta":{"caller":"test","reason":"testing","traceId":"trace123"}}`
req := httptest.NewRequest(http.MethodPut, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes", strings.NewReader(jsonBody))
req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000")

err := handler.CreateAttribute(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusCreated, rec.Code)
}

func TestCreateAttribute_DatabaseErrorOnCreate(t *testing.T) {
callCount := 0
mockDB := &MockDBTX{
QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
callCount++
if callCount == 1 {
// GetPersonById - success
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
return nil
},
}
}
// CreateOrUpdatePersonAttribute - error
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
return errors.New("database error")
},
}
},
}

queries := db.New(mockDB)
handler := NewPersonAttributesHandler(queries)

e := echo.New()
jsonBody := `{"key":"email","value":"test@example.com","meta":{"caller":"test","reason":"testing","traceId":"123"}}`
req := httptest.NewRequest(http.MethodPut, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes", strings.NewReader(jsonBody))
req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000")

err := handler.CreateAttribute(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusInternalServerError, rec.Code)
assert.Contains(t, rec.Body.String(), "Failed to create attribute")
}

func TestCreateAttribute_DatabaseErrorOnGet(t *testing.T) {
personID := pgtype.UUID{}
personID.Scan("123e4567-e89b-12d3-a456-426614174000")

callCount := 0
mockDB := &MockDBTX{
QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
callCount++
if callCount <= 3 {
// GetPersonById, CreateOrUpdatePersonAttribute, InsertRequestLog - success
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
if callCount == 2 {
*dest[0].(*int32) = 1
*dest[1].(*pgtype.UUID) = personID
*dest[2].(*string) = "email"
*dest[3].(*int32) = 1
*dest[4].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true}
*dest[5].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true}
} else if callCount == 3 {
*dest[0].(*int32) = 1
*dest[1].(*string) = "trace123"
*dest[2].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true}
}
return nil
},
}
}
// GetPersonAttribute - error
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
return errors.New("database error")
},
}
},
}

queries := db.New(mockDB)
handler := NewPersonAttributesHandler(queries)

e := echo.New()
jsonBody := `{"key":"email","value":"test@example.com","meta":{"caller":"test","reason":"testing","traceId":"trace123"}}`
req := httptest.NewRequest(http.MethodPut, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes", strings.NewReader(jsonBody))
req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000")

err := handler.CreateAttribute(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusInternalServerError, rec.Code)
assert.Contains(t, rec.Body.String(), "Failed to retrieve attribute")
}

func TestUpdateAttribute_ErrorOnDeleteKeyChange(t *testing.T) {
personID := pgtype.UUID{}
personID.Scan("123e4567-e89b-12d3-a456-426614174000")

mockDB := &MockDBTX{
QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
return nil
},
}
},
QueryFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgx.Rows, error) {
return &MockRows{
rows: [][]interface{}{
{int32(1), personID, "oldkey", "old@example.com", int32(1), pgtype.Timestamp{Valid: true}, pgtype.Timestamp{Valid: true}},
},
}, nil
},
ExecFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgconn.CommandTag, error) {
return pgconn.CommandTag{}, errors.New("database error")
},
}

queries := db.New(mockDB)
handler := NewPersonAttributesHandler(queries)

e := echo.New()
jsonBody := `{"key":"newkey","value":"updated@example.com"}`
req := httptest.NewRequest(http.MethodPut, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes/1", strings.NewReader(jsonBody))
req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId", "attributeId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000", "1")

err := handler.UpdateAttribute(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusInternalServerError, rec.Code)
assert.Contains(t, rec.Body.String(), "Failed to update attribute")
}

func TestUpdateAttribute_ErrorOnUpdate(t *testing.T) {
personID := pgtype.UUID{}
personID.Scan("123e4567-e89b-12d3-a456-426614174000")

callCount := 0
mockDB := &MockDBTX{
QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
callCount++
if callCount == 1 {
// GetPersonById - success
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
return nil
},
}
}
// CreateOrUpdatePersonAttribute - error
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
return errors.New("database error")
},
}
},
QueryFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgx.Rows, error) {
return &MockRows{
rows: [][]interface{}{
{int32(1), personID, "email", "test@example.com", int32(1), pgtype.Timestamp{Valid: true}, pgtype.Timestamp{Valid: true}},
},
}, nil
},
}

queries := db.New(mockDB)
handler := NewPersonAttributesHandler(queries)

e := echo.New()
jsonBody := `{"value":"updated@example.com"}`
req := httptest.NewRequest(http.MethodPut, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes/1", strings.NewReader(jsonBody))
req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId", "attributeId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000", "1")

err := handler.UpdateAttribute(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusInternalServerError, rec.Code)
assert.Contains(t, rec.Body.String(), "Failed to update attribute")
}

func TestUpdateAttribute_ErrorOnGetAfterUpdate(t *testing.T) {
personID := pgtype.UUID{}
personID.Scan("123e4567-e89b-12d3-a456-426614174000")

callCount := 0
mockDB := &MockDBTX{
QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
callCount++
if callCount <= 2 {
// GetPersonById and CreateOrUpdatePersonAttribute - success
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
if callCount == 2 {
*dest[0].(*int32) = 1
*dest[1].(*pgtype.UUID) = personID
*dest[2].(*string) = "email"
*dest[3].(*int32) = 1
*dest[4].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true}
*dest[5].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true}
}
return nil
},
}
}
// GetPersonAttribute - error
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
return errors.New("database error")
},
}
},
QueryFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgx.Rows, error) {
return &MockRows{
rows: [][]interface{}{
{int32(1), personID, "email", "test@example.com", int32(1), pgtype.Timestamp{Valid: true}, pgtype.Timestamp{Valid: true}},
},
}, nil
},
}

queries := db.New(mockDB)
handler := NewPersonAttributesHandler(queries)

e := echo.New()
jsonBody := `{"value":"updated@example.com"}`
req := httptest.NewRequest(http.MethodPut, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes/1", strings.NewReader(jsonBody))
req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId", "attributeId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000", "1")

err := handler.UpdateAttribute(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusInternalServerError, rec.Code)
assert.Contains(t, rec.Body.String(), "Failed to retrieve updated attribute")
}

func TestDeleteAttribute_ErrorOnDelete(t *testing.T) {
personID := pgtype.UUID{}
personID.Scan("123e4567-e89b-12d3-a456-426614174000")

mockDB := &MockDBTX{
QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
return nil
},
}
},
QueryFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgx.Rows, error) {
return &MockRows{
rows: [][]interface{}{
{int32(1), personID, "email", "test@example.com", int32(1), pgtype.Timestamp{Valid: true}, pgtype.Timestamp{Valid: true}},
},
}, nil
},
ExecFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgconn.CommandTag, error) {
return pgconn.CommandTag{}, errors.New("database error")
},
}

queries := db.New(mockDB)
handler := NewPersonAttributesHandler(queries)

e := echo.New()
req := httptest.NewRequest(http.MethodDelete, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes/1", nil)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId", "attributeId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000", "1")

err := handler.DeleteAttribute(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusInternalServerError, rec.Code)
assert.Contains(t, rec.Body.String(), "Failed to delete attribute")
}

// Test for UpdateAttribute without providing a key (should keep existing key)
func TestUpdateAttribute_WithoutKeyProvided(t *testing.T) {
personID := pgtype.UUID{}
personID.Scan("123e4567-e89b-12d3-a456-426614174000")

callCount := 0
mockDB := &MockDBTX{
QueryRowFunc: func(ctx context.Context, query string, arguments ...interface{}) pgx.Row {
callCount++
if callCount <= 2 {
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
// GetPersonById success, CreateOrUpdatePersonAttribute will be handled
return nil
},
}
}
return &MockRow{
ScanFunc: func(dest ...interface{}) error {
// GetPersonAttribute after update - return updated attribute with same key
*dest[0].(*int32) = 1
*dest[1].(*pgtype.UUID) = personID
*dest[2].(*string) = "existing-key"
*dest[3].(*string) = "new-value"
*dest[4].(*int32) = 1
*dest[5].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true}
*dest[6].(*pgtype.Timestamp) = pgtype.Timestamp{Valid: true}
return nil
},
}
},
QueryFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgx.Rows, error) {
// GetAllPersonAttributes - return existing attribute
return &MockRows{
rows: [][]interface{}{
{int32(1), personID, "existing-key", "old-value", int32(1), pgtype.Timestamp{Valid: true}, pgtype.Timestamp{Valid: true}},
},
}, nil
},
ExecFunc: func(ctx context.Context, query string, arguments ...interface{}) (pgconn.CommandTag, error) {
return pgconn.CommandTag{}, nil
},
}

queries := db.New(mockDB)
handler := NewPersonAttributesHandler(queries)

e := echo.New()
// Update without providing key - should keep existing key
jsonBody := `{"value":"new-value","meta":{"caller":"test","reason":"testing","traceId":"123"}}`
req := httptest.NewRequest(http.MethodPut, "/persons/123e4567-e89b-12d3-a456-426614174000/attributes/1", strings.NewReader(jsonBody))
req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
rec := httptest.NewRecorder()
c := e.NewContext(req, rec)
c.SetParamNames("personId", "attributeId")
c.SetParamValues("123e4567-e89b-12d3-a456-426614174000", "1")

err := handler.UpdateAttribute(c)

assert.NoError(t, err)
assert.Equal(t, http.StatusOK, rec.Code)
assert.Contains(t, rec.Body.String(), "existing-key")
assert.Contains(t, rec.Body.String(), "new-value")
}
