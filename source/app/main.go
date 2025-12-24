package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
	_ "github.com/lib/pq"

	db "person-service/internal/db/generated"
)

// ============================================================================
// I/O LAYER - HTTP Handlers using Echo Framework
// ============================================================================

// HealthHandler handles HTTP requests for the /health endpoint
// This is the I/O Layer that directly calls HealthCheck
func HealthHandler(queries *db.Queries) echo.HandlerFunc {
	return func(c echo.Context) error {
		// Call HealthCheck directly
		err := queries.HealthCheck(context.Background())
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]interface{}{
				"status": "unhealthy",
				"error":  err.Error(),
			})
		}

		// Return healthy status
		return c.JSON(http.StatusOK, map[string]interface{}{
			"status": "healthy",
		})
	}
}

// ============================================================================
// MAIN - Application Entry Point
// ============================================================================

func main() {
	// Load configuration from environment variables
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatalln("ERROR: DATABASE_URL environment variable is not set")
	}

	// Validate port
	if _, err := strconv.Atoi(port); err != nil {
		log.Fatalf("ERROR: Invalid PORT value: %s\n", err)
	}

	// Initialize database connection with SQLC queries
	database, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatalf("ERROR: Failed to open database: %v\n", err)
	}
	defer database.Close()

	if err := database.Ping(); err != nil {
		log.Fatalf("ERROR: Failed to ping database: %v\n", err)
	}

	queries := db.New(database)

	log.Println("INFO: Database connection successful")

	// Create and setup Echo server
	e := echo.New()

	// Setup routes
	e.GET("/health", HealthHandler(queries))

	// Configure server
	e.Server = &http.Server{
		Addr:         ":" + port,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Channel to listen for interrupt signals
	go func() {
		log.Printf("INFO: Server starting on port %s\n", port)
		if err := e.Start(e.Server.Addr); err != nil && err != http.ErrServerClosed {
			log.Printf("ERROR: Server error: %v\n", err)
		}
	}()

	// Graceful shutdown
	// This is a simplified version. For production, use a signal handler.
	// For now, we'll let it run indefinitely.
	select {}
}
