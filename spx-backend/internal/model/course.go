package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
)

// Course is the model for courses.
type Course struct {
	Model

	// OwnerID is the ID of the course owner.
	OwnerID int64 `gorm:"column:owner_id;index"`
	Owner   User  `gorm:"foreignKey:OwnerID"`

	// Title is the title of the course.
	Title string `gorm:"column:title;index:,class:FULLTEXT"`

	// Thumbnail is the universal URL of the course's thumbnail image.
	Thumbnail string `gorm:"column:thumbnail"`

	// Entrypoint is the starting URL of the course.
	Entrypoint string `gorm:"column:entrypoint"`

	// References contains the references of the course.
	References ReferenceCollection `gorm:"column:references"`

	// Prompt is the prompt (for copilot) of the course.
	Prompt string `gorm:"column:prompt"`
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (Course) TableName() string {
	return "course"
}

// Reference represents a reference in a course.
type Reference struct {
	// Type is the type of the reference. Currently only "project" is supported.
	Type string `json:"type"`
	// FullName is the full name of the reference project, in the format "owner/project".
	FullName string `json:"fullName"`
}

// ReferenceCollection is a slice of references. It is used to store references information.
type ReferenceCollection []Reference

// Scan implements [sql.Scanner].
func (rc *ReferenceCollection) Scan(src any) error {
	switch src := src.(type) {
	case []byte:
		var parsed ReferenceCollection
		if err := json.Unmarshal(src, &parsed); err != nil {
			return fmt.Errorf("failed to unmarshal ReferenceCollection: %w", err)
		}
		*rc = parsed
	case nil:
		*rc = nil
	default:
		return errors.New("incompatible type for ReferenceCollection")
	}
	return nil
}

// Value implements [driver.Valuer].
func (rc ReferenceCollection) Value() (driver.Value, error) {
	return json.Marshal(rc)
}
