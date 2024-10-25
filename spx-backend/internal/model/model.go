package model

import (
	"context"
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Model is the base model for all models.
type Model struct {
	ID        int64          `gorm:"column:id;autoIncrement;primaryKey"`
	CreatedAt time.Time      `gorm:"column:created_at;not null"`
	UpdatedAt time.Time      `gorm:"column:updated_at;not null"`
	DeletedAt gorm.DeletedAt `gorm:"column:deleted_at;index"`
}

// OpenDB opens the database with the given dsn and models to be migrated.
func OpenDB(ctx context.Context, dsn string, maxOpenConns, maxIdleConns int, models ...any) (*gorm.DB, error) {
	dialector := mysql.New(mysql.Config{DSN: dsn})
	db, err := gorm.Open(dialector, &gorm.Config{
		Logger:  logger.Discard,
		NowFunc: func() time.Time { return time.Now().UTC() },
	})
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database/sql.DB: %w", err)
	}
	sqlDB.SetMaxOpenConns(maxOpenConns)
	sqlDB.SetMaxIdleConns(maxIdleConns)
	if len(models) > 0 {
		if err := db.WithContext(ctx).AutoMigrate(models...); err != nil {
			return nil, fmt.Errorf("failed to auto migrate models: %w", err)
		}
		for _, model := range models {
			// NOTE: Workaround for https://github.com/go-gorm/gorm/issues/7227.
			if am, ok := model.(interface{ AfterMigrate(tx *gorm.DB) error }); ok {
				if err := db.WithContext(ctx).Transaction(am.AfterMigrate); err != nil {
					return nil, fmt.Errorf("failed to run AfterMigrate: %w", err)
				}
			}
		}
	}
	return db, nil
}

// Visibility indicates the visibility of an item.
type Visibility uint8

const (
	VisibilityPrivate Visibility = iota
	VisibilityPublic
)

// ParseVisibility parses the string representation of the visibility.
func ParseVisibility(s string) Visibility {
	switch s {
	case "private":
		return VisibilityPrivate
	case "public":
		return VisibilityPublic
	}
	return 255
}

// String implements [fmt.Stringer]. It returns the string representation of the
// visibility.
func (v Visibility) String() string {
	switch v {
	case VisibilityPrivate:
		return "private"
	case VisibilityPublic:
		return "public"
	}
	return "unknown"
}

// FileCollection is a map from relative path to universal URL. It is used to
// store files information.
type FileCollection map[string]string

// Scan implements [sql.Scanner].
func (fc *FileCollection) Scan(src any) error {
	switch src := src.(type) {
	case []byte:
		var parsed FileCollection
		if err := json.Unmarshal(src, &parsed); err != nil {
			return fmt.Errorf("failed to unmarshal FileCollection: %w", err)
		}
		*fc = parsed
	case nil:
		*fc = FileCollection{}
	default:
		return errors.New("incompatible type for FileCollection")
	}
	return nil
}

// Value implements [driver.Valuer].
func (fc FileCollection) Value() (driver.Value, error) {
	return json.Marshal(fc)
}
