package model

import (
	"time"
)

// AIResource represents an AI-generated resource (e.g., SVG images).
type AIResource struct {
	Model
	
	// URL is the resource access URL.
	URL string `gorm:"column:url;type:varchar(255);not null" json:"url"`
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (AIResource) TableName() string {
	return "aiResource"
}

// Label represents a tag for categorizing AI resources.
type Label struct {
	Model
	
	// LabelName is the unique label name.
	LabelName string `gorm:"column:labelName;type:varchar(50);not null;uniqueIndex" json:"labelName"`
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (Label) TableName() string {
	return "label"
}

// ResourceLabel represents the many-to-many relationship between AI resources and labels.
type ResourceLabel struct {
	Model
	
	// AIResourceID is the foreign key to aiResource table.
	AIResourceID int64 `gorm:"column:aiResourceId;not null;index" json:"aiResourceId"`
	
	// LabelID is the foreign key to label table.
	LabelID int64 `gorm:"column:labelId;not null;index" json:"labelId"`
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (ResourceLabel) TableName() string {
	return "resource_label"
}

// ResourceUsageStats represents usage statistics for AI resources.
type ResourceUsageStats struct {
	// ID is the primary key.
	ID int64 `gorm:"column:id;autoIncrement;primaryKey" json:"id"`
	
	// AIResourceID is the foreign key to aiResource table.
	AIResourceID int64 `gorm:"column:ai_resource_id;not null;uniqueIndex" json:"ai_resource_id"`
	
	// ViewCount is the number of times the resource has been viewed.
	ViewCount int64 `gorm:"column:view_count;default:0" json:"view_count"`
	
	// SelectionCount is the number of times the resource has been selected.
	SelectionCount int64 `gorm:"column:selection_count;default:0" json:"selection_count"`
	
	// LastUsedAt is the timestamp when the resource was last used.
	LastUsedAt time.Time `gorm:"column:last_used_at" json:"last_used_at"`
	
	// CreatedAt is the creation timestamp.
	CreatedAt time.Time `gorm:"column:created_at;not null" json:"created_at"`
	
	// UpdatedAt is the last update timestamp.
	UpdatedAt time.Time `gorm:"column:updated_at;not null" json:"updated_at"`
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (ResourceUsageStats) TableName() string {
	return "resource_usage_stats"
}