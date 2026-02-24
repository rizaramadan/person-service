package logging

import (
	"context"
	"os"
	"person-service/tracing"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestInit(t *testing.T) {
	// Reset state
	defaultLogger = nil
	gcpProjectID = ""

	Init()

	assert.NotNil(t, defaultLogger)
}

func TestInit_WithGCPProjectID(t *testing.T) {
	os.Setenv("GCP_PROJECT_ID", "test-project")
	defer os.Unsetenv("GCP_PROJECT_ID")

	defaultLogger = nil
	Init()

	assert.NotNil(t, defaultLogger)
	assert.Equal(t, "test-project", gcpProjectID)
}

func TestLogger_InitializesOnNil(t *testing.T) {
	defaultLogger = nil

	logger := Logger()
	assert.NotNil(t, logger)
	assert.NotNil(t, defaultLogger)
}

func TestLogger_ReturnsCached(t *testing.T) {
	Init()
	logger1 := Logger()
	logger2 := Logger()
	assert.Equal(t, logger1, logger2)
}

func TestLoggerFromContext_NoTraceID(t *testing.T) {
	Init()
	ctx := context.Background()

	logger := LoggerFromContext(ctx)
	assert.NotNil(t, logger)
}

func TestLoggerFromContext_WithTraceID(t *testing.T) {
	os.Unsetenv("GCP_PROJECT_ID")
	defaultLogger = nil
	gcpProjectID = ""
	Init()

	ctx := tracing.ContextWithTraceID(context.Background(), "test-trace-123")

	logger := LoggerFromContext(ctx)
	assert.NotNil(t, logger)
}

func TestLoggerFromContext_WithGCPProject(t *testing.T) {
	os.Setenv("GCP_PROJECT_ID", "my-project")
	defer os.Unsetenv("GCP_PROJECT_ID")
	defaultLogger = nil
	Init()

	ctx := tracing.ContextWithTraceID(context.Background(), "test-trace-456")

	logger := LoggerFromContext(ctx)
	assert.NotNil(t, logger)
}

func TestInfo(t *testing.T) {
	Init()
	// Should not panic
	Info("test info message", "key", "value")
}

func TestError(t *testing.T) {
	Init()
	Error("test error message", "key", "value")
}

func TestWarn(t *testing.T) {
	Init()
	Warn("test warn message", "key", "value")
}

func TestDebug(t *testing.T) {
	Init()
	Debug("test debug message", "key", "value")
}

func TestInfoContext(t *testing.T) {
	Init()
	ctx := tracing.ContextWithTraceID(context.Background(), "trace-1")
	InfoContext(ctx, "test info context", "key", "value")
}

func TestErrorContext(t *testing.T) {
	Init()
	ctx := tracing.ContextWithTraceID(context.Background(), "trace-2")
	ErrorContext(ctx, "test error context", "key", "value")
}

func TestWarnContext(t *testing.T) {
	Init()
	ctx := tracing.ContextWithTraceID(context.Background(), "trace-3")
	WarnContext(ctx, "test warn context", "key", "value")
}

func TestDebugContext(t *testing.T) {
	Init()
	ctx := tracing.ContextWithTraceID(context.Background(), "trace-4")
	DebugContext(ctx, "test debug context", "key", "value")
}
