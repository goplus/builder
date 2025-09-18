package controller

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/model"
	"gorm.io/gorm"
)

// TrafficSourceParams contains parameters for recording traffic source.
type TrafficSourceParams struct {
	Platform string `json:"platform"`
}

// Validate validates the traffic source parameters.
func (p *TrafficSourceParams) Validate() (ok bool, msg string) {
	switch p.Platform {
	case "wechat", "qq", "douyin", "xiaohongshu", "bilibili":
		return true, ""
	default:
		return false, "invalid platform, must be one of: wechat, qq, douyin, xiaohongshu, bilibili"
	}
}

// RecordTrafficSource records a traffic source entry with deduplication.
func (ctrl *Controller) RecordTrafficSource(ctx context.Context, params *TrafficSourceParams, ipAddress string) error {
	// Check if there's a record from the same IP within the last minute
	oneMinuteAgo := time.Now().UTC().Add(-1 * time.Minute)
	
	var existingRecord model.TrafficSource
	err := ctrl.db.WithContext(ctx).
		Where("ip_address = ?", ipAddress).
		Where("platform = ?", params.Platform).
		Where("created_at > ?", oneMinuteAgo).
		Where("deleted_at IS NULL").
		First(&existingRecord).Error
	
	// If record exists, skip creating new one
	if err == nil {
		return nil // Already recorded within the last minute
	}
	
	// If error is not "record not found", return the error
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("failed to check existing traffic source record: %w", err)
	}

	// Create new record
	record := &model.TrafficSource{
		Platform:  params.Platform,
		IPAddress: ipAddress,
	}

	// Set user ID if user is authenticated
	if user, ok := authn.UserFromContext(ctx); ok {
		record.UserID = &user.ID
	}

	if err := ctrl.db.WithContext(ctx).Create(record).Error; err != nil {
		return fmt.Errorf("failed to create traffic source record: %w", err)
	}

	return nil
}