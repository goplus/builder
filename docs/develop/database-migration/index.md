# Database Migration System

## Overview

This document describes the design and implementation of an automatic database migration system for spx-backend,
addressing the issues outlined in [#1958](https://github.com/goplus/builder/issues/1958).

## Current problems

The current database setup has critical limitations:
- **No functional migration mechanism**: While
  [`model.OpenDB`](https://github.com/goplus/builder/blob/e1bab5cff5a2a7392f812d292af6889ce299f555/spx-backend/internal/model/model.go#L36-L58)
  supports optional models for [GORM's Auto Migration](https://gorm.io/docs/migration.html), the
  [actual call](https://github.com/goplus/builder/blob/e1bab5cff5a2a7392f812d292af6889ce299f555/spx-backend/cmd/spx-backend/main.yap#L51-L55)
  passes no models, making the feature non-functional.
- **Manual table creation required**: Database tables must be manually created and maintained, causing inconsistencies
  across environments.
- **GORM Auto Migration limitations**: Even if enabled, GORM's Auto Migration is unsuitable for production as it lacks
  rollback capability, won't delete obsolete columns, and can cause performance issues with `ALTER TABLE` operations on
  large tables.
- **MySQL-specific challenges**: Unlike PostgreSQL's
  [Transactional DDL](https://wiki.postgresql.org/wiki/Transactional_DDL_in_PostgreSQL:_A_Competitive_Analysis), MySQL
  doesn't support rolling back DDL operations within transactions, requiring explicit down scripts for rollbacks.

## Design goals

- **Automatic migration**: Execute database migrations automatically on application startup without manual intervention.
- **Zero downtime**: Support concurrent deployments with proper locking mechanisms to prevent conflicts.
- **Environment adaptability**: Provide appropriate behavior for development and production environments.
- **Rollback support**: Enable safe rollback of problematic migrations when needed.
- **Production safety**: Ensure migrations are safe for production use with proper error handling and monitoring.

## Success criteria

The implementation will be considered successful when:
1. Database schema automatically synchronizes on application startup.
2. Multiple instances can safely deploy without migration conflicts.
3. Schema changes are version controlled and reviewable.
4. Rollback capability exists for emergency situations.
5. Development workflow is simplified without manual SQL execution.
6. Single binary deployment without external file dependencies.

## Technical solution

### Migration engine

We will use [golang-migrate/migrate](https://github.com/golang-migrate/migrate) v4 as the migration engine because it
provides:
- **Built-in MySQL locking**: Uses
  [`GET_LOCK()`](https://dev.mysql.com/doc/refman/8.0/en/locking-functions.html#function_get-lock) and
  [`RELEASE_LOCK()`](https://dev.mysql.com/doc/refman/8.0/en/locking-functions.html#function_release-lock) for
  concurrent safety.
- **Version tracking**: Maintains migration history in a `schema_migration` table.
- **Bidirectional migrations**: Supports both up and down migrations for rollback capability.
- **Production-ready**: Battle-tested library used in production by many organizations.

### Package structure

```
internal/migration/
├── migration.go      # Core migration logic and auto-migration functionality.
├── status.go         # Migration status checking and reporting.
└── migrations/       # Migration files embedded in binary.
    ├── 001_initial_schema.up.sql
    ├── 001_initial_schema.down.sql
    └── ...
```

### Migration file strategy

#### File organization

Migration files are organized in the `internal/migration/migrations/` directory:

```
internal/migration/migrations/
├── 001_initial_schema.up.sql
├── 001_initial_schema.down.sql
├── 002_add_user_email.up.sql
└── 002_add_user_email.down.sql
```

File naming follows the pattern `{version}_{description}.{direction}.sql`:
- **Version**: Incrementing integers (001, 002, etc.)
- **Description**: Brief description using underscores
- **Direction**: `up` for forward migration, `down` for rollback

#### Embedded approach

Migration files are embedded into the binary using Go's [`embed`](https://pkg.go.dev/embed) package, providing several
advantages:
- **Single deployment unit**: Only the binary file needs to be deployed
- **Version consistency**: Migration scripts are always synchronized with the application version
- **Container-friendly**: Simplifies Docker images and Kubernetes deployments
- **Reduced errors**: Eliminates file path issues and missing migration files
- **Security**: Migration files cannot be accidentally modified in production

## Implementation details

### Database configuration

```go
// internal/config/config.go
type DatabaseConfig struct {
    DSN              string
    AutoMigrate      bool          // Whether to automatically apply migrations.
    MigrationTimeout time.Duration // Maximum time for migration execution.
}

// GetMigrationTimeout returns the migration timeout, defaulting to 5 minutes.
func (c *DatabaseConfig) GetMigrationTimeout() time.Duration {
    if c.MigrationTimeout > 0 {
        return c.MigrationTimeout
    }
    return 5 * time.Minute
}
```

### Migrator implementation

```go
// internal/migration/migration.go
package migration

import (
    "database/sql"
    "embed"
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

//go:embed migrations/*.sql
var migrationsFS embed.FS

type Migrator struct {
    dsn     string
    timeout time.Duration
}

func New(dsn string, timeout time.Duration) *Migrator {
    return &Migrator{
        dsn:     dsn,
        timeout: timeout,
    }
}

func (m *Migrator) Migrate() error {
    logger := log.GetLogger()

    logger.Println("checking database migration status")

    // Open database connection.
    db, err := sql.Open("mysql", m.dsn)
    if err != nil {
        return fmt.Errorf("failed to open database: %w", err)
    }
    defer db.Close()

    // Create MySQL driver with custom migration table name.
    driver, err := mysql.WithInstance(db, &mysql.Config{
        MigrationsTable: MigrationsTableName,
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
    migrate, err := migrate.NewWithInstance("iofs", sourceDriver, "mysql", driver)
    if err != nil {
        return fmt.Errorf("failed to create migrator: %w", err)
    }
    defer migrate.Close()

    // ... migration logic ...

    logger.Println("database migration completed successfully")
    return nil
}
```

### Migration execution flow

```mermaid
flowchart TD
    A[Application start] --> B{Auto-migrate enabled?}
    B -->|No| C[Continue startup]
    B -->|Yes| D[Create migrator]
    D --> E[Load embedded migrations]
    E --> F[Check current version]
    F --> G{Database dirty?}
    G -->|Yes| H[Exit: Manual intervention required]
    G -->|No| I[Check pending migrations]
    I --> J{Migrations needed?}
    J -->|No| C
    J -->|Yes| L[Acquire lock]
    L --> M[Double-check migrations needed]
    M --> N{Still need migrations?}
    N -->|No| O[Release lock]
    N -->|Yes| P[Execute migrations]
    P --> Q{Success?}
    Q -->|Yes| O
    Q -->|No| R[Log error & exit]
    O --> C
```

### Concurrent instance handling

When multiple instances start simultaneously:
1. **All instances**: Check if migrations are needed (first check).
2. **First instance**: Acquires MySQL advisory lock via `GET_LOCK('migration_lock', timeout)`.
3. **Other instances**: Wait for lock release.
4. **Instance with lock**: Double-checks if migrations are still needed (second check).
5. **Execute or skip**: If still needed, execute migrations; otherwise release lock immediately.
6. **Lock release**: Automatic on connection close or explicit via `RELEASE_LOCK()`.

This **double-checked locking pattern** prevents race conditions and ensures:
- Only one instance executes migrations
- No redundant migration attempts after another instance completes them

### Application integration

```go
// cmd/spx-backend/main.yap
func main() {
    // ... existing initialization ...

    // Execute automatic migration if enabled.
    if cfg.Database.AutoMigrate {
        migrator := migration.New(cfg.Database.DSN, cfg.Database.GetMigrationTimeout())
        if err := migrator.Migrate(); err != nil {
            logger.Fatalln("Database migration failed:", err)
        }
    }

    // Open database connection (no models parameter needed).
    db, err := model.OpenDB(context.Background(), cfg.Database.DSN, 0, 0)
    if err != nil {
        logger.Fatalln("Failed to open database:", err)
    }

    // ... rest of initialization ...
}
```

## Getting started

### Creating initial migration from existing schema

Since the project already has an established database schema, create the initial migration manually:

1. **Export current schema structure**:

   ```bash
   # Export schema without data from existing database
   mysqldump --no-data --skip-comments --skip-add-drop-table your_database > temp_schema.sql
   ```

2. **Create the up migration**:
   - Clean and format the exported SQL
   - Remove MySQL-specific comments and version headers
   - Ensure proper table creation order (dependencies first)
   - Save as `internal/migration/migrations/001_initial_schema.up.sql`

3. **Create the down migration**:
   - Write `DROP TABLE` statements in reverse dependency order
   - Use `IF EXISTS` to avoid errors if tables don't exist
   - Save as `internal/migration/migrations/001_initial_schema.down.sql`

### Key considerations

- **Generated columns**: Handle MySQL's
  [generated columns](https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html) like
  `_deleted_at_is_null` correctly
- **Foreign key constraints**: Ensure proper creation and deletion order
- **Indexes**: Include all indexes from the original schema
- **Test both directions**: Verify that `up` followed by `down` works cleanly

## Configuration

### Environment-specific settings

```yaml
# Development environment
database:
  dsn: "mysql://user:pass@localhost/db_dev"
  autoMigrate: true     # Automatically apply migrations.
  migrationTimeout: 5m  # Shorter timeout for faster feedback.

# Production environment
database:
  dsn: "mysql://user:pass@prod-host/db_prod"
  autoMigrate: true     # Still automatic, but with safeguards.
  migrationTimeout: 10m # Longer timeout for large migrations.
```

### Connection requirements

The MySQL connection string must include:

```
?multiStatements=true&parseTime=true
```

This enables multi-statement migrations and proper time parsing.

## Error handling

### Migration states

- **Clean**: No pending migrations, application starts normally.
- **Pending**: Has unapplied migrations, requires execution.
- **Dirty**: Previous migration failed mid-execution, requires manual cleanup.
- **Locked**: Another instance is currently migrating.

### Error responses

```go
// Dirty state detected
"database is dirty at version %d, manual intervention required"

// Pending migrations with auto-migrate disabled
"database has %d pending migrations, enable auto-migration or apply manually"

// Migration timeout
"migration timed out after %v"

// Lock acquisition failure
"failed to acquire migration lock: %w"
```

## Rollback strategy

### Automatic rollback

The system automatically rollbacks failed migrations when safe to do so:
- SQL syntax errors, constraint violations: automatic rollback
- Connection errors, lock timeouts: preserve state for debugging

### Manual rollback

For manual intervention situations:

```bash
# Check current migration state
SELECT version, dirty FROM schema_migration;

# Use golang-migrate CLI for manual rollback
migrate -path migrations -database "mysql://..." -verbose down 1
```

## Risk assessment

### Low risk

- Adding new tables
- Adding nullable columns
- Creating non-unique indexes

### Medium risk

- Adding NOT NULL columns (requires default values)
- Creating unique indexes (may fail on duplicate data)
- Modifying column types

### High risk

- Dropping columns or tables
- Renaming columns (requires data migration)
- Large table `ALTER` operations (consider online DDL)
