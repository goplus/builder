package controller

import (
	"context"
	"fmt"
	"strconv"

	"github.com/goplus/builder/spx-backend/internal/model"
	"gorm.io/gorm"
)

// TrafficSourceDTO is the DTO for traffic sources.
type TrafficSourceDTO struct {
	ModelDTO

	Platform    string `json:"platform"`
	AccessCount int64  `json:"accessCount"`
}

// toTrafficSourceDTO converts the model traffic source to its DTO.
func toTrafficSourceDTO(mTrafficSource model.TrafficSource) TrafficSourceDTO {
	return TrafficSourceDTO{
		ModelDTO:    toModelDTO(mTrafficSource.Model),
		Platform:    mTrafficSource.Platform,
		AccessCount: mTrafficSource.AccessCount,
	}
}

// CreateTrafficSource creates a new traffic source record.
func (ctrl *Controller) CreateTrafficSource(ctx context.Context, platform string) (*TrafficSourceDTO, error) {
	if platform == "" {
		return nil, fmt.Errorf("platform is required")
	}

	// Create new traffic source record
	record := &model.TrafficSource{
		Platform:    platform,
		AccessCount: 0,
	}

	if err := ctrl.db.WithContext(ctx).Create(record).Error; err != nil {
		return nil, fmt.Errorf("failed to create traffic source record: %w", err)
	}

	// Convert to DTO and return
	dto := toTrafficSourceDTO(*record)
	return &dto, nil
}

// RecordTrafficAccess records an access to existing traffic source.
func (ctrl *Controller) RecordTrafficAccess(ctx context.Context, trafficSourceID string) error {
	// Parse traffic source ID
	id, err := strconv.ParseInt(trafficSourceID, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid traffic source ID: %w", err)
	}

	// Check if traffic source exists and increment access count
	result := ctrl.db.WithContext(ctx).
		Model(&model.TrafficSource{}).
		Where("id = ? AND deleted_at IS NULL", id).
		UpdateColumn("access_count", gorm.Expr("access_count + ?", 1))

	if result.Error != nil {
		return fmt.Errorf("failed to update access count: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("traffic source not found")
	}

	return nil
}