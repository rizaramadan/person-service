package tracing

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseGCPTraceHeader_Empty(t *testing.T) {
	result := ParseGCPTraceHeader("")
	assert.Equal(t, "", result)
}

func TestParseGCPTraceHeader_ValidHeader(t *testing.T) {
	result := ParseGCPTraceHeader("105445aa7843bc8bf206b12000100000/1;o=1")
	assert.Equal(t, "105445aa7843bc8bf206b12000100000", result)
}

func TestParseGCPTraceHeader_TraceIDOnly(t *testing.T) {
	result := ParseGCPTraceHeader("105445aa7843bc8bf206b12000100000")
	assert.Equal(t, "105445aa7843bc8bf206b12000100000", result)
}

func TestParseGCPTraceHeader_SlashButEmptyTraceID(t *testing.T) {
	result := ParseGCPTraceHeader("/1;o=1")
	assert.Equal(t, "", result)
}

func TestContextWithTraceID_And_TraceIDFromContext(t *testing.T) {
	ctx := context.Background()
	traceID := "test-trace-id-123"

	ctx = ContextWithTraceID(ctx, traceID)
	result := TraceIDFromContext(ctx)

	assert.Equal(t, traceID, result)
}

func TestTraceIDFromContext_NilContext(t *testing.T) {
	result := TraceIDFromContext(nil)
	assert.Equal(t, "", result)
}

func TestTraceIDFromContext_NoTraceID(t *testing.T) {
	ctx := context.Background()
	result := TraceIDFromContext(ctx)
	assert.Equal(t, "", result)
}

func TestTraceIDFromContext_WrongType(t *testing.T) {
	ctx := context.WithValue(context.Background(), TraceIDKey, 12345)
	result := TraceIDFromContext(ctx)
	assert.Equal(t, "", result)
}
