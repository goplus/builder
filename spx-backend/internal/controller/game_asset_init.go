package controller

import (
	"context"

	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/model"
)

// InitializeGameAssetsData initializes sample game assets data if the table is empty
func (c *Controller) InitializeGameAssetsData(ctx context.Context) error {
	logger := log.GetReqLogger(ctx)

	// Check if data already exists
	var count int64
	if err := c.db.WithContext(ctx).Model(&model.GameAsset{}).Count(&count).Error; err != nil {
		return err
	}

	if count > 0 {
		logger.Printf("Game assets data already exists (%d records), skipping initialization", count)
		return nil
	}

	// Insert sample data
	logger.Println("Initializing game assets sample data...")

	for _, asset := range SampleGameAssets {
		if err := c.db.WithContext(ctx).Create(&asset).Error; err != nil {
			logger.Printf("Failed to insert asset %s: %v", asset.Name, err)
			return err
		}
	}

	logger.Printf("Successfully initialized %d game assets", len(SampleGameAssets))
	return nil
}
