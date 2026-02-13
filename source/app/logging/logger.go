package logging

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"person-service/tracing"
)

const (
	// GCPTraceField is the field name GCP Cloud Logging uses for trace correlation
	GCPTraceField = "logging.googleapis.com/trace"
)

var (
	// defaultLogger is the package-level logger instance
	defaultLogger *slog.Logger

	// gcpProjectID is the GCP project ID for trace correlation
	gcpProjectID string
)

// Init initializes the global structured logger with JSON output.
// Should be called once at application startup.
func Init() {
	gcpProjectID = os.Getenv("GCP_PROJECT_ID")

	// Create JSON handler for GCP Cloud Logging compatibility
	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})

	defaultLogger = slog.New(handler)
	slog.SetDefault(defaultLogger)
}

// Logger returns the default logger instance.
func Logger() *slog.Logger {
	if defaultLogger == nil {
		Init()
	}
	return defaultLogger
}

// LoggerFromContext returns a logger with the trace ID from context attached.
// The trace ID is formatted for GCP Cloud Logging correlation.
func LoggerFromContext(ctx context.Context) *slog.Logger {
	logger := Logger()

	traceID := tracing.TraceIDFromContext(ctx)
	if traceID == "" {
		return logger
	}

	// Format trace for GCP: projects/PROJECT_ID/traces/TRACE_ID
	var traceValue string
	if gcpProjectID != "" {
		traceValue = fmt.Sprintf("projects/%s/traces/%s", gcpProjectID, traceID)
	} else {
		// Fallback for local dev - just use trace ID directly
		traceValue = traceID
	}

	return logger.With(GCPTraceField, traceValue)
}

// Info logs an info message with optional attributes.
func Info(msg string, args ...any) {
	Logger().Info(msg, args...)
}

// Error logs an error message with optional attributes.
func Error(msg string, args ...any) {
	Logger().Error(msg, args...)
}

// Warn logs a warning message with optional attributes.
func Warn(msg string, args ...any) {
	Logger().Warn(msg, args...)
}

// Debug logs a debug message with optional attributes.
func Debug(msg string, args ...any) {
	Logger().Debug(msg, args...)
}

// InfoContext logs an info message with trace ID from context.
func InfoContext(ctx context.Context, msg string, args ...any) {
	LoggerFromContext(ctx).Info(msg, args...)
}

// ErrorContext logs an error message with trace ID from context.
func ErrorContext(ctx context.Context, msg string, args ...any) {
	LoggerFromContext(ctx).Error(msg, args...)
}

// WarnContext logs a warning message with trace ID from context.
func WarnContext(ctx context.Context, msg string, args ...any) {
	LoggerFromContext(ctx).Warn(msg, args...)
}

// DebugContext logs a debug message with trace ID from context.
func DebugContext(ctx context.Context, msg string, args ...any) {
	LoggerFromContext(ctx).Debug(msg, args...)
}
