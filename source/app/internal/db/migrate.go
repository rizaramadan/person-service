package db

import (
	"context"
	"embed"
	"errors"
	"person-service/logging"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

// RunMigrations applies all pending database migrations.
// It uses the embedded migration files and the provided connection pool.
func RunMigrations(ctx context.Context, pool *pgxpool.Pool, databaseURL string) error {
	logger := logging.LoggerFromContext(ctx)
	logger.Info("Starting database migrations")

	// Create source driver from embedded filesystem
	source, err := iofs.New(migrationsFS, "migrations")
	if err != nil {
		logger.Error("Failed to create migration source", "error", err)
		return err
	}

	// Create migrate instance
	// Note: We use the database URL directly as golang-migrate manages its own connection
	m, err := migrate.NewWithSourceInstance("iofs", source, databaseURL)
	if err != nil {
		logger.Error("Failed to create migrate instance", "error", err)
		return err
	}
	defer m.Close()

	// Run migrations
	err = m.Up()
	if err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			logger.Info("Database schema is up to date, no migrations needed")
			return nil
		}
		logger.Error("Migration failed", "error", err)
		return err
	}

	// Get current version after migration
	version, dirty, err := m.Version()
	if err != nil && !errors.Is(err, migrate.ErrNilVersion) {
		logger.Warn("Could not get migration version", "error", err)
	} else {
		logger.Info("Database migrations completed successfully",
			"version", version,
			"dirty", dirty,
		)
	}

	return nil
}
