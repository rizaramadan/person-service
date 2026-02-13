package middleware

import (
	"person-service/tracing"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

const (
	// GCPTraceHeader is the header name for GCP Cloud Trace context
	GCPTraceHeader = "X-Cloud-Trace-Context"

	// TraceIDResponseHeader is the header returned to clients for debugging
	TraceIDResponseHeader = "X-Trace-ID"

	// EchoTraceIDKey is the key used to store trace ID in Echo context
	EchoTraceIDKey = "trace-id"
)

// TraceMiddleware extracts the trace ID from GCP Load Balancer headers
// and propagates it through the request context.
// If no trace header is present, generates a UUID as fallback (for local dev).
func TraceMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Extract trace ID from GCP header
			gcpTraceHeader := c.Request().Header.Get(GCPTraceHeader)
			traceID := tracing.ParseGCPTraceHeader(gcpTraceHeader)

			// Generate fallback UUID if no trace header present (local dev)
			if traceID == "" {
				traceID = uuid.New().String()
			}

			// Store trace ID in Echo context for easy access in handlers
			c.Set(EchoTraceIDKey, traceID)

			// Add trace ID to response header for debugging
			c.Response().Header().Set(TraceIDResponseHeader, traceID)

			// Create new Go context with trace ID for downstream propagation
			ctx := tracing.ContextWithTraceID(c.Request().Context(), traceID)
			c.SetRequest(c.Request().WithContext(ctx))

			return next(c)
		}
	}
}
