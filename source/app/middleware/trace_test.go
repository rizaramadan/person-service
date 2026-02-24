package middleware

import (
	"net/http"
	"net/http/httptest"
	"person-service/tracing"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
)

func TestTraceMiddleware_WithGCPHeader(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set(GCPTraceHeader, "105445aa7843bc8bf206b12000100000/1;o=1")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	middleware := TraceMiddleware()
	handler := middleware(func(c echo.Context) error {
		// Verify trace ID is set in Echo context
		traceID := c.Get(EchoTraceIDKey)
		assert.Equal(t, "105445aa7843bc8bf206b12000100000", traceID)

		// Verify trace ID is in Go context
		ctxTraceID := tracing.TraceIDFromContext(c.Request().Context())
		assert.Equal(t, "105445aa7843bc8bf206b12000100000", ctxTraceID)

		return c.String(http.StatusOK, "OK")
	})

	err := handler(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "105445aa7843bc8bf206b12000100000", rec.Header().Get(TraceIDResponseHeader))
}

func TestTraceMiddleware_WithoutGCPHeader(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	middleware := TraceMiddleware()
	handler := middleware(func(c echo.Context) error {
		// Verify a UUID was generated as fallback
		traceID := c.Get(EchoTraceIDKey).(string)
		assert.NotEmpty(t, traceID)
		assert.Len(t, traceID, 36) // UUID format: 8-4-4-4-12

		// Verify it's in the response header too
		assert.Equal(t, traceID, rec.Header().Get(TraceIDResponseHeader))

		// Verify it's in Go context
		ctxTraceID := tracing.TraceIDFromContext(c.Request().Context())
		assert.Equal(t, traceID, ctxTraceID)

		return c.String(http.StatusOK, "OK")
	})

	err := handler(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)
}

func TestTraceMiddleware_EmptyGCPHeader(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set(GCPTraceHeader, "")
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	middleware := TraceMiddleware()
	handler := middleware(func(c echo.Context) error {
		// Empty header should generate UUID fallback
		traceID := c.Get(EchoTraceIDKey).(string)
		assert.NotEmpty(t, traceID)
		assert.Len(t, traceID, 36)
		return c.String(http.StatusOK, "OK")
	})

	err := handler(c)
	assert.NoError(t, err)
}

func TestTraceMiddleware_PropagatesNextError(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	middleware := TraceMiddleware()
	expectedErr := echo.NewHTTPError(http.StatusInternalServerError, "test error")
	handler := middleware(func(c echo.Context) error {
		return expectedErr
	})

	err := handler(c)
	assert.Equal(t, expectedErr, err)
}
