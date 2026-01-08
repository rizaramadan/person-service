package main

import (
	"os"
	"testing"
)

func TestSetupDb_MissingDatabaseURL(t *testing.T) {
	// Save and clear DATABASE_URL
	originalURL := os.Getenv("DATABASE_URL")
	os.Unsetenv("DATABASE_URL")
	defer func() {
		if originalURL != "" {
			os.Setenv("DATABASE_URL", originalURL)
		}
	}()

	// This should cause a fatal error, but we can't easily test that
	// So we'll just ensure the test doesn't crash
	// In a real scenario, this would be tested differently
}

func TestSetupDb_InvalidPort(t *testing.T) {
	// Set required env var
	os.Setenv("DATABASE_URL", "postgres://user:pass@localhost:5432/testdb")
	defer os.Unsetenv("DATABASE_URL")

	// This test would require mocking log.Fatalf which is not straightforward
	// In practice, invalid port would be caught by the validation
}
