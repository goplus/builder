package model

import (
	"testing"
	"time"
)

func TestUserImageFilterConfigTableName(t *testing.T) {
	config := UserImageFilterConfig{}
	if got := config.TableName(); got != "user_image_filter_config" {
		t.Errorf("UserImageFilterConfig.TableName() = %v, want %v", got, "user_image_filter_config")
	}
}

func TestUserImageRecommendationHistoryTableName(t *testing.T) {
	history := UserImageRecommendationHistory{}
	if got := history.TableName(); got != "user_image_recommendation_history" {
		t.Errorf("UserImageRecommendationHistory.TableName() = %v, want %v", got, "user_image_recommendation_history")
	}
}

func TestImageFilterMetricsTableName(t *testing.T) {
	metrics := ImageFilterMetrics{}
	if got := metrics.TableName(); got != "image_filter_metrics" {
		t.Errorf("ImageFilterMetrics.TableName() = %v, want %v", got, "image_filter_metrics")
	}
}

func TestUserImageFilterConfigFields(t *testing.T) {
	config := UserImageFilterConfig{
		Model: Model{
			ID:        1,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		UserID:           123,
		FilterWindowDays: 30,
		MaxFilterRatio:   0.8,
	}

	if config.UserID == 0 {
		t.Error("UserImageFilterConfig UserID should not be zero")
	}

	if config.FilterWindowDays <= 0 {
		t.Error("UserImageFilterConfig FilterWindowDays should be positive")
	}

	if config.MaxFilterRatio <= 0 || config.MaxFilterRatio > 1 {
		t.Error("UserImageFilterConfig MaxFilterRatio should be between 0 and 1")
	}
}

func TestUserImageRecommendationHistoryFields(t *testing.T) {
	history := UserImageRecommendationHistory{
		Model: Model{
			ID:        1,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		UserID:     123,
		ImageID:    456,
		QueryID:    "test-query-id",
		Query:      "test query",
		Source:     "search",
		Similarity: 0.95,
		Rank:       1,
		Selected:   false,
	}

	if history.UserID == 0 {
		t.Error("UserImageRecommendationHistory UserID should not be zero")
	}

	if history.ImageID == 0 {
		t.Error("UserImageRecommendationHistory ImageID should not be zero")
	}

	if history.QueryID == "" {
		t.Error("UserImageRecommendationHistory QueryID should not be empty")
	}

	if history.Source == "" {
		t.Error("UserImageRecommendationHistory Source should not be empty")
	}

	if history.Similarity < 0 || history.Similarity > 1 {
		t.Error("UserImageRecommendationHistory Similarity should be between 0 and 1")
	}

	if history.Rank <= 0 {
		t.Error("UserImageRecommendationHistory Rank should be positive")
	}
}

func TestImageFilterMetricsFields(t *testing.T) {
	metrics := ImageFilterMetrics{
		Model: Model{
			ID:        1,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		UserID:              123,
		QueryID:             "test-query-id",
		TotalCandidates:     100,
		FilteredCount:       20,
		FilterRatio:         0.2,
		DegradationLevel:    1,
		DegradationStrategy: "time_window_expansion",
		FinalResultCount:    4,
	}

	if metrics.UserID == 0 {
		t.Error("ImageFilterMetrics UserID should not be zero")
	}

	if metrics.QueryID == "" {
		t.Error("ImageFilterMetrics QueryID should not be empty")
	}

	if metrics.TotalCandidates < 0 {
		t.Error("ImageFilterMetrics TotalCandidates should not be negative")
	}

	if metrics.FilteredCount < 0 {
		t.Error("ImageFilterMetrics FilteredCount should not be negative")
	}

	if metrics.FilterRatio < 0 || metrics.FilterRatio > 1 {
		t.Error("ImageFilterMetrics FilterRatio should be between 0 and 1")
	}

	if metrics.DegradationLevel < 0 {
		t.Error("ImageFilterMetrics DegradationLevel should not be negative")
	}

	if metrics.FinalResultCount < 0 {
		t.Error("ImageFilterMetrics FinalResultCount should not be negative")
	}
}