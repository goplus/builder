package controller

import (
	"context"
)

// CompleteGameAssetName provides auto-completion for game asset names
func (c *Controller) CompleteGameAssetName(ctx context.Context, prefix string, limit int) ([]string, error) {
	return c.assetCompletion.CompleteAssetName(ctx, prefix, limit)
}
