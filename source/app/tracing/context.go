package tracing

import (
	"context"
	"strings"
)

// contextKey is a custom type for context keys to avoid collisions
type contextKey string

const (
	// TraceIDKey is the context key for storing trace ID
	TraceIDKey contextKey = "trace-id"
)

// ParseGCPTraceHeader parses the X-Cloud-Trace-Context header from GCP Load Balancer.
// Format: TRACE_ID/SPAN_ID;o=TRACE_TRUE
// Returns the trace ID portion, or empty string if parsing fails.
func ParseGCPTraceHeader(header string) string {
	if header == "" {
		return ""
	}

	// Split on "/" to get trace ID (first part)
	traceID := strings.Split(header, "/")[0]
	if traceID == "" {
		return ""
	}

	return traceID
}

// ContextWithTraceID creates a new context with the trace ID stored.
func ContextWithTraceID(ctx context.Context, traceID string) context.Context {
	return context.WithValue(ctx, TraceIDKey, traceID)
}

// TraceIDFromContext retrieves the trace ID from the context.
// Returns empty string if no trace ID is found.
func TraceIDFromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}

	traceID, ok := ctx.Value(TraceIDKey).(string)
	if !ok {
		return ""
	}

	return traceID
}
