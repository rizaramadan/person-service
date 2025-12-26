package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	health "person-service/healthcheck"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	_ "github.com/lib/pq"

	db "person-service/internal/db/generated"
)

// ============================================================================
// I/O LAYER - HTTP Handlers using Echo Framework
// ============================================================================

// SetValueRequest represents the request body for setting a key-value pair
type SetValueRequest struct {
	Key   string `json:"key" validate:"required"`
	Value string `json:"value" validate:"required"`
}

// SetValueHandler handles POST /api/key_value - sets or updates a key-value pair
func SetValueHandler(queries *db.Queries) echo.HandlerFunc {
	return func(c echo.Context) error {
		// Parse request body
		var req SetValueRequest
		if err := c.Bind(&req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]interface{}{
				"error": "Invalid request body",
			})
		}

		// Validate required fields
		if req.Key == "" || req.Value == "" {
			return c.JSON(http.StatusBadRequest, map[string]interface{}{
				"error": "Key and value are required",
			})
		}

		// Set value in database
		ctx := context.Background()
		err := queries.SetValue(ctx, db.SetValueParams{
			Key:   req.Key,
			Value: req.Value,
		})

		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]interface{}{
				"error": "Failed to set value",
			})
		}

		// Retrieve the full record with timestamps
		record, err := queries.GetKeyValue(ctx, req.Key)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]interface{}{
				"error": "Failed to retrieve value",
			})
		}

		// Return success with the full key-value record
		response := map[string]interface{}{
			"key":   record.Key,
			"value": record.Value,
		}

		// Add timestamps if they are valid
		if record.CreatedAt.Valid {
			response["created_at"] = record.CreatedAt.Time
		}
		if record.UpdatedAt.Valid {
			response["updated_at"] = record.UpdatedAt.Time
		}

		return c.JSON(http.StatusOK, response)
	}
}

// GetValueHandler handles GET /api/key_value/:key - retrieves a value by key
func GetValueHandler(queries *db.Queries) echo.HandlerFunc {
	return func(c echo.Context) error {
		key := c.Param("key")
		if key == "" {
			return c.JSON(http.StatusBadRequest, map[string]interface{}{
				"error": "Key parameter is required",
			})
		}

		// Get full record from database
		ctx := context.Background()
		record, err := queries.GetKeyValue(ctx, key)

		if err != nil {
			if err == sql.ErrNoRows {
				return c.JSON(http.StatusNotFound, map[string]interface{}{
					"error": "Key not found",
				})
			}
			return c.JSON(http.StatusInternalServerError, map[string]interface{}{
				"error": "Failed to retrieve value",
			})
		}

		// Return the full key-value record
		response := map[string]interface{}{
			"key":   record.Key,
			"value": record.Value,
		}

		// Add timestamps if they are valid
		if record.CreatedAt.Valid {
			response["created_at"] = record.CreatedAt.Time
		}
		if record.UpdatedAt.Valid {
			response["updated_at"] = record.UpdatedAt.Time
		}

		return c.JSON(http.StatusOK, response)
	}
}

// DeleteValueHandler handles DELETE /api/key_value/:key - deletes a key-value pair
func DeleteValueHandler(queries *db.Queries) echo.HandlerFunc {
	return func(c echo.Context) error {
		key := c.Param("key")
		if key == "" {
			return c.JSON(http.StatusBadRequest, map[string]interface{}{
				"error": "Key parameter is required",
			})
		}

		// Delete value from database
		ctx := context.Background()
		err := queries.DeleteValue(ctx, key)

		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]interface{}{
				"error": "Failed to delete value",
			})
		}

		// Return success message
		return c.JSON(http.StatusOK, map[string]interface{}{
			"message": "Key deleted successfully",
		})
	}
}

// ============================================================================
// MAIN - Application Entry Point
// ============================================================================

func setupDb(port string) *db.Queries {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatalln("ERROR: DATABASE_URL environment variable is not set")
	}

	// Add connection timeout parameters if not present
	if !strings.Contains(databaseURL, "connect_timeout") {
		separator := "?"
		if strings.Contains(databaseURL, "?") {
			separator = "&"
		}
		databaseURL = databaseURL + separator + "connect_timeout=10"
	}

	// Validate port
	if _, err := strconv.Atoi(port); err != nil {
		log.Fatalf("ERROR: Invalid PORT value: %s\n", err)
	}

	fmt.Fprintf(os.Stdout, "INFO: Connecting to database...\n")

	// Initialize database connection with SQLC queries
	fmt.Fprintf(os.Stdout, "DEBUG: Opening database connection...\n")
	database, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatalf("ERROR: Failed to open database: %v\n", err)
	}
	defer database.Close()

	fmt.Fprintf(os.Stdout, "DEBUG: Setting connection pool parameters...\n")
	// Set connection timeouts
	database.SetMaxOpenConns(25)
	database.SetMaxIdleConns(5)
	database.SetConnMaxLifetime(5 * time.Minute)

	fmt.Fprintf(os.Stdout, "DEBUG: Pinging database...\n")
	// Ping database with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := database.PingContext(ctx); err != nil {
		fmt.Fprintf(os.Stderr, "ERROR: Database ping failed: %v\n", err)
		log.Fatalf("ERROR: Failed to ping database: %v\n", err)
	}

	fmt.Fprintf(os.Stdout, "DEBUG: Database ping successful!\n")

	queries := db.New(database)
	return queries
}

func main() {
	// Ensure logs are written immediately (unbuffered)
	log.SetFlags(log.LstdFlags)

	_, err := fmt.Fprintf(os.Stdout, "INFO: Application starting...\n")
	if err != nil {
		log.Fatalf("ERROR: Failed to start application: %v\n", err)
	}

	// Load configuration from environment variables
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	queries := setupDb(port)

	log.Println("INFO: Database connection successful")
	fmt.Fprintf(os.Stdout, "INFO: Database connection successful\n")

	// Create and setup Echo server
	e := echo.New()
	e.HideBanner = true
	e.HidePort = true

	healthService := health.NewHealthCheckHandler(queries)

	// Setup routes
	e.GET("/health", healthService.Check)

	// Key-value API routes
	e.POST("/api/key-value", SetValueHandler(queries))
	e.GET("/api/key-value/:key", GetValueHandler(queries))
	e.DELETE("/api/key-value/:key", DeleteValueHandler(queries))

	// Configure server
	e.Server = &http.Server{
		Addr:         ":" + port,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Log before starting server
	log.Printf("INFO: Server starting on port %s\n", port)
	fmt.Fprintf(os.Stdout, "INFO: Server starting on port %s\n", port)
	fmt.Fprintf(os.Stderr, "INFO: Server starting on port %s\n", port)

	// Start server in goroutine
	go func() {
		if err := e.Start(e.Server.Addr); err != nil && err != http.ErrServerClosed {
			log.Printf("ERROR: Server error: %v\n", err)
		}
	}()

	// Give server time to start
	time.Sleep(100 * time.Millisecond)

	log.Printf("INFO: Server ready and listening on port %s\n", port)
	fmt.Fprintf(os.Stdout, "INFO: Server ready on port %s\n", port)
	fmt.Fprintf(os.Stderr, "INFO: Server ready on port %s\n", port)

	// Graceful shutdown
	// This is a simplified version. For production, use a signal handler.
	// For now, we'll let it run indefinitely.
	select {}
}
