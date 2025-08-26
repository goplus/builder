package model

import (
	"time"
)

// AIResource represents an AI-generated resource (e.g., SVG images).
type AIResource struct {
	Model
	URL string `gorm:"column:url;not null" json:"url"`
}

// TableName returns the table name for AIResource.
func (AIResource) TableName() string {
	return "aiResource"
}

// Label represents a tag for categorizing AI resources.
type Label struct {
	Model
	Name string `gorm:"column:labelName;type:varchar(50);uniqueIndex;not null" json:"name"`
}

// TableName returns the table name for Label.
func (Label) TableName() string {
	return "label"
}

// ResourceLabel represents the many-to-many relationship between AI resources and labels.
type ResourceLabel struct {
	Model
	ResourceID int64 `gorm:"column:aiResourceId;not null;index" json:"resource_id"`
	LabelID    int64 `gorm:"column:labelId;not null;index" json:"label_id"`
}

// TableName returns the table name for ResourceLabel.
func (ResourceLabel) TableName() string {
	return "resource_label"
}

// ResourceUsageStats represents usage statistics for AI resources.
type ResourceUsageStats struct {
	ID             int64     `gorm:"column:id;autoIncrement;primaryKey" json:"id"`
	AIResourceID   int64     `gorm:"column:ai_resource_id;not null;uniqueIndex" json:"ai_resource_id"`
	ViewCount      int64     `gorm:"column:view_count;default:0" json:"view_count"`
	SelectionCount int64     `gorm:"column:selection_count;default:0" json:"selection_count"`
	LastUsedAt     time.Time `gorm:"column:last_used_at" json:"last_used_at"`
	CreatedAt      time.Time `gorm:"column:created_at;not null" json:"created_at"`
	UpdatedAt      time.Time `gorm:"column:updated_at;not null" json:"updated_at"`
}

// TableName returns the table name for ResourceUsageStats.
func (ResourceUsageStats) TableName() string {
	return "resource_usage_stats"
}