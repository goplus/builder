package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// StringSlice is a custom type for JSON string array
type StringSlice []string

// Scan implements the sql.Scanner interface for StringSlice
func (s *StringSlice) Scan(value interface{}) error {
	if value == nil {
		*s = nil
		return nil
	}

	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("cannot scan %T into StringSlice", value)
	}

	return json.Unmarshal(bytes, s)
}

// Value implements the driver.Valuer interface for StringSlice
func (s StringSlice) Value() (driver.Value, error) {
	if s == nil {
		return nil, nil
	}
	return json.Marshal(s)
}

// ProjectKeywords represents the project keywords model
type ProjectKeywords struct {
	Model

	// ProjectID is the ID of the associated project
	ProjectID int64 `gorm:"column:project_id;index;not null"`
	Project   Project `gorm:"foreignKey:ProjectID"`

	// Keywords contains the generated keywords for the project
	Keywords StringSlice `gorm:"column:keywords;type:json;not null"`

	// GeneratedAt is when the keywords were generated
	GeneratedAt time.Time `gorm:"column:generated_at;not null"`

	// Theme is the theme used during generation (optional)
	Theme string `gorm:"column:theme;default:''"`

	// Status tracks the generation status
	Status KeywordStatus `gorm:"column:status;default:'pending'"`

	// GenerationPrompt stores the prompt used for generation
	GenerationPrompt string `gorm:"column:generation_prompt;type:text"`
}

// KeywordStatus represents the status of keyword generation
type KeywordStatus string

const (
	KeywordStatusPending   KeywordStatus = "pending"
	KeywordStatusGenerating KeywordStatus = "generating" 
	KeywordStatusCompleted KeywordStatus = "completed"
	KeywordStatusFailed    KeywordStatus = "failed"
)

// TableName implements gorm.io/gorm/schema.Tabler
func (ProjectKeywords) TableName() string {
	return "project_keywords"
}

// IsEmpty checks if keywords list is empty
func (pk *ProjectKeywords) IsEmpty() bool {
	return len(pk.Keywords) == 0
}

// AddKeyword adds a new keyword if not already present
func (pk *ProjectKeywords) AddKeyword(keyword string) {
	for _, k := range pk.Keywords {
		if k == keyword {
			return // Already exists
		}
	}
	pk.Keywords = append(pk.Keywords, keyword)
}

// RemoveKeyword removes a keyword from the list
func (pk *ProjectKeywords) RemoveKeyword(keyword string) {
	for i, k := range pk.Keywords {
		if k == keyword {
			pk.Keywords = append(pk.Keywords[:i], pk.Keywords[i+1:]...)
			return
		}
	}
}

// GetKeywords returns a copy of the keywords slice
func (pk *ProjectKeywords) GetKeywords() []string {
	result := make([]string, len(pk.Keywords))
	copy(result, pk.Keywords)
	return result
}