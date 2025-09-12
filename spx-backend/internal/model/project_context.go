package model

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

// ProjectContext stores context information and associated keywords for a project
type ProjectContext struct {
	ProjectID    int64     `gorm:"primaryKey;column:project_id" json:"project_id"`
	Name         string    `gorm:"column:name;size:255;not null" json:"name"`
	Description  string    `gorm:"column:description;type:text" json:"description"`
	RelatedWords WordsList `gorm:"column:related_words;type:json" json:"related_words"`
	CreatedAt    time.Time `gorm:"column:created_at;not null;default:CURRENT_TIMESTAMP" json:"created_at"`
}

// TableName implements gorm.io/gorm/schema.Tabler
func (ProjectContext) TableName() string {
	return "project_context"
}

// WordsList represents a list of related words as JSON array in database
type WordsList []string

// Scan implements the sql.Scanner interface for GORM JSON support
func (wl *WordsList) Scan(value interface{}) error {
	if value == nil {
		*wl = WordsList{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return json.Unmarshal(value.([]byte), wl)
	}

	return json.Unmarshal(bytes, wl)
}

// Value implements the driver.Valuer interface for GORM JSON support
func (wl WordsList) Value() (driver.Value, error) {
	if len(wl) == 0 {
		return "[]", nil
	}
	return json.Marshal(wl)
}

// ToSlice returns the words as a simple string slice
func (wl WordsList) ToSlice() []string {
	return []string(wl)
}

// IsEmpty checks if the word list is empty
func (wl WordsList) IsEmpty() bool {
	return len(wl) == 0
}

// Count returns the number of words
func (wl WordsList) Count() int {
	return len(wl)
}
