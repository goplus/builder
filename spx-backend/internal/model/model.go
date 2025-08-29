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

	"github.com/goplus/builder/spx-backend/internal/tracer/gormsentry"
)

// Model is the base model for all models.
type Model struct {
	ID        int64          `gorm:"column:id;autoIncrement;primaryKey"`
	CreatedAt time.Time      `gorm:"column:created_at;not null"`
	UpdatedAt time.Time      `gorm:"column:updated_at;not null"`
	DeletedAt gorm.DeletedAt `gorm:"column:deleted_at;index"`
}

// _deleted_at_is_null is the Gorm data type representing a generated column
// that has a value of 1 when deleted_at is null and NULL otherwise. It is
// typically used to create composite soft unique indexes with other columns.
type _deleted_at_is_null bool

// GormDataType implements [gorm.io/gorm/schema.GormDataTypeInterface].
func (_deleted_at_is_null) GormDataType() string {
	return "bit(1) GENERATED ALWAYS AS (CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END) STORED"
}

// OpenDB opens the database with the given dsn.
func OpenDB(ctx context.Context, dsn string, maxOpenConns, maxIdleConns int) (*gorm.DB, error) {
	dialector := mysql.New(mysql.Config{DSN: dsn})
	db, err := gorm.Open(dialector, &gorm.Config{
		Logger:  gormsentry.New(logger.Discard, nil, gormsentry.DefaultConfig()),
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
	return db, nil
}

// Visibility indicates the visibility of an item.
type Visibility uint8

const (
	VisibilityPrivate Visibility = iota
	VisibilityPublic
)

// ParseVisibility parses the string representation of a visibility.
func ParseVisibility(s string) (Visibility, error) {
	var v Visibility
	return v, v.UnmarshalText([]byte(s))
}

// String implements [fmt.Stringer].
func (v Visibility) String() string {
	if text, err := v.MarshalText(); err == nil {
		return string(text)
	}
	return fmt.Sprintf("Visibility(%d)", v)
}

// MarshalText implements [encoding.TextMarshaler].
func (v Visibility) MarshalText() ([]byte, error) {
	switch v {
	case VisibilityPrivate:
		return []byte("private"), nil
	case VisibilityPublic:
		return []byte("public"), nil
	default:
		return nil, fmt.Errorf("invalid visibility: %d", v)
	}
}

// UnmarshalText implements [encoding.TextUnmarshaler].
func (v *Visibility) UnmarshalText(text []byte) error {
	switch string(text) {
	case "private":
		*v = VisibilityPrivate
	case "public":
		*v = VisibilityPublic
	default:
		return fmt.Errorf("invalid visibility: %s", text)
	}
	return nil
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
