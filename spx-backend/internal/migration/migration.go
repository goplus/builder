package migration

import (
	"database/sql"
	"embed"
	"errors"
	"fmt"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/mysql"
	"github.com/golang-migrate/migrate/v4/source/iofs"

	"github.com/goplus/builder/spx-backend/internal/log"
)

// MigrationsTableName is the migration history table name.
//
// NOTE: The MigrationsTableName should never be changed once migrations have
// been run, as it would cause migrations to restart from the beginning.
const MigrationsTableName = "schema_migration"

// migrationsFS contains all SQL migration files embedded in the binary.
//
//go:embed migrations/*.sql
var migrationsFS embed.FS

// Migrator handles database schema migrations.
type Migrator struct {
	dsn     string
	timeout time.Duration
}

// New creates a new [Migrator].
func New(dsn string, timeout time.Duration) *Migrator {
	return &Migrator{
		dsn:     dsn,
		timeout: timeout,
	}
}

// Migrate executes pending database migrations.
func (m *Migrator) Migrate() error {
	logger := log.GetLogger()

	// Open database connection.
	db, err := sql.Open("mysql", m.dsn)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}
	defer db.Close()

	// Test connection.
	if err := db.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	// Create MySQL driver with custom migration table name and statement timeout.
	driver, err := mysql.WithInstance(db, &mysql.Config{
		MigrationsTable:  MigrationsTableName,
		StatementTimeout: m.timeout,
	})
	if err != nil {
		return fmt.Errorf("failed to create mysql driver: %w", err)
	}

	// Create source driver from embedded filesystem.
	sourceDriver, err := iofs.New(migrationsFS, "migrations")
	if err != nil {
		return fmt.Errorf("failed to create source driver: %w", err)
	}

	// Create migrator with custom configuration.
	migrator, err := migrate.NewWithInstance("iofs", sourceDriver, "mysql", driver)
	if err != nil {
		return fmt.Errorf("failed to create migrator: %w", err)
	}
	defer migrator.Close()

	// Set lock timeout to use configured migration timeout.
	migrator.LockTimeout = m.timeout

	// Get current migration status.
	version, dirty, err := migrator.Version()
	if err == nil {
		logger.Printf("database current migration version: %d", version)
	} else if errors.Is(err, migrate.ErrNilVersion) {
		logger.Println("database has no migrations applied, will initialize schema")
	} else {
		return fmt.Errorf("failed to get migration version: %w", err)
	}

	// Check if database is in dirty state.
	if dirty {
		return fmt.Errorf("database is dirty at version %d, manual intervention required", version)
	}

	// Execute pending migrations.
	if err := migrator.Up(); err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			logger.Println("database is already up to date, no migrations needed")
			return nil
		}
		return fmt.Errorf("failed to run migrations: %w", err)
	}
	logger.Println("database migration completed successfully")
	return nil
}
