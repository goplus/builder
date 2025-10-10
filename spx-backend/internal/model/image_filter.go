package model

import (
	"time"
)

// UserImageFilterConfig represents user-specific configuration for image recommendation filtering
type UserImageFilterConfig struct {
	Model

	// UserID is the foreign key to user table
	UserID int64 `gorm:"column:user_id;not null;uniqueIndex" json:"user_id"`

	// MaxFilterRatio is the maximum ratio of results that can be filtered out (0-1, default 0.8)
	MaxFilterRatio float64 `gorm:"column:max_filter_ratio;type:decimal(3,2);default:0.80" json:"max_filter_ratio"`

	// SessionEnabled indicates if session-level filtering is enabled for this user
	SessionEnabled bool `gorm:"column:session_enabled;default:true" json:"session_enabled"`
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (UserImageFilterConfig) TableName() string {
	return "user_image_filter_config"
}

// UserImageRecommendationHistory tracks which images have been recommended to users
type UserImageRecommendationHistory struct {
	Model

	// UserID is the foreign key to user table
	UserID int64 `gorm:"column:user_id;not null;index:idx_user_image" json:"user_id"`

	// ImageID is the ID of the recommended image (from search results or AI generated)
	ImageID int64 `gorm:"column:image_id;not null;index:idx_user_image" json:"image_id"`

	// QueryID is the recommendation query ID for tracking
	QueryID string `gorm:"column:query_id;type:varchar(36);not null;index" json:"query_id"`

	// SessionID is the session ID for tracking user sessions (nullable for backward compatibility)
	SessionID *string `gorm:"column:session_id;type:varchar(36);index:idx_user_session" json:"session_id"`

	// Query is the user's original search query
	Query string `gorm:"column:query;type:text" json:"query"`

	// Source indicates where the image came from ("search" or "generated")
	Source string `gorm:"column:source;type:varchar(20);not null" json:"source"`

	// Similarity is the similarity score for the recommendation
	Similarity float64 `gorm:"column:similarity;type:decimal(5,3)" json:"similarity"`

	// Rank is the position of this image in the recommendation results
	Rank int `gorm:"column:rank;not null" json:"rank"`

	// Selected indicates if this image was actually chosen by the user
	Selected bool `gorm:"column:selected;default:false;index" json:"selected"`

	// SelectedAt is the timestamp when the image was selected (nullable)
	SelectedAt *time.Time `gorm:"column:selected_at" json:"selected_at"`
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (UserImageRecommendationHistory) TableName() string {
	return "user_image_recommendation_history"
}

// ImageFilterMetrics tracks filtering performance and degradation events
type ImageFilterMetrics struct {
	Model

	// UserID is the foreign key to user table
	UserID int64 `gorm:"column:user_id;not null;index" json:"user_id"`

	// QueryID is the recommendation query ID
	QueryID string `gorm:"column:query_id;type:varchar(36);not null;index" json:"query_id"`

	// TotalCandidates is the total number of search candidates before filtering
	TotalCandidates int `gorm:"column:total_candidates;not null" json:"total_candidates"`

	// FilteredCount is the number of candidates filtered out
	FilteredCount int `gorm:"column:filtered_count;not null" json:"filtered_count"`

	// FilterRatio is the actual filter ratio (filtered_count / total_candidates)
	FilterRatio float64 `gorm:"column:filter_ratio;type:decimal(5,3)" json:"filter_ratio"`

	// DegradationLevel indicates which degradation strategy was applied (0=none, 1-4=levels)
	DegradationLevel int `gorm:"column:degradation_level;default:0" json:"degradation_level"`

	// DegradationStrategy describes which strategy was used for degradation
	DegradationStrategy string `gorm:"column:degradation_strategy;type:varchar(100)" json:"degradation_strategy"`

	// FinalResultCount is the final number of results returned to user
	FinalResultCount int `gorm:"column:final_result_count;not null" json:"final_result_count"`
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (ImageFilterMetrics) TableName() string {
	return "image_filter_metrics"
}