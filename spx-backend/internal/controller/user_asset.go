package controller

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/model"
)

// AddUserAssetParams holds parameters for adding an user asset.
type AddUserAssetParams struct {
	// AssetID is the identifier for the asset.
	AssetID string `json:"assetId"`
}

// ListUserAssetsParams holds parameters for listing assets.
type ListUserAssetsParams struct {
	// Owner is the owner filter, applied only if non-nil.
	Owner *string

	// AccessType is the access type filter, applied only if non-nil.
	AssetType *model.AssetType

	// OrderBy is the order by condition.
	OrderBy ListAssetsOrderBy

	// Pagination is the pagination information.
	Pagination model.Pagination
}

// AddUserAsset adds an asset.
func (ctrl *Controller) AddUserAsset(ctx context.Context, params *AddUserAssetParams, assetType string, owner string) error {
	logger := log.GetReqLogger(ctx)
	fmt.Println("AddUserAsset, assetType: ", assetType)
	assetId, err := strconv.Atoi(params.AssetID)
	err = model.AddUserAsset(ctx, ctrl.ormDb, &model.UserAsset{
		Owner:             owner,
		AssetID:           assetId,
		RelationType:      model.RelationType(assetType),
		RelationTimestamp: time.Now(),
	})
	if err != nil {
		logger.Printf("failed to add asset: %v", err)
		return err
	}

	return nil
}

// ListUserAssets lists assets for a specific user with various filter and sort options.
func (ctrl *Controller) ListUserAssets(ctx context.Context, assetType string, params *ListUserAssetsParams) (*model.ByPage[model.Asset], error) {
	logger := log.GetReqLogger(ctx)

	// Initialize the filter conditions
	var wheres []model.FilterCondition

	// Apply additional filters based on parameters
	if params.Owner != nil {
		wheres = append(wheres, model.FilterCondition{Column: "ua.owner", Operation: "=", Value: *params.Owner})
	}
	if params.AssetType != nil {
		wheres = append(wheres, model.FilterCondition{Column: "asset_type", Operation: "=", Value: *params.AssetType})
	}
	wheres = append(wheres, model.FilterCondition{Column: "ua.relation_type", Operation: "=", Value: assetType})

	// Define order conditions based on input
	var orders []model.OrderByCondition
	switch params.OrderBy {
	case TimeAsc:
		orders = append(orders, model.OrderByCondition{Column: "c_time", Direction: "ASC"})
	case TimeDesc:
		orders = append(orders, model.OrderByCondition{Column: "c_time", Direction: "DESC"})
	case NameAsc:
		orders = append(orders, model.OrderByCondition{Column: "display_name", Direction: "ASC"})
	case NameDesc:
		orders = append(orders, model.OrderByCondition{Column: "display_name", Direction: "DESC"})
	case ClickCountDesc:
		orders = append(orders, model.OrderByCondition{Column: "click_count", Direction: "DESC"})
	}

	// Use the QueryByPage function to get paginated results
	query := `
		SELECT a.*
		FROM asset a
		RIGHT JOIN user_asset ua ON a.id = ua.asset_id
	`

	assets, err := model.ListUserAssets(ctx, ctrl.db, params.Pagination, wheres, orders, query)
	if err != nil {
		logger.Printf("failed to list user assets: %v", err)
		return nil, err
	}

	return assets, nil
}

// DeleteUserAsset deletes an asset.
func (ctrl *Controller) DeleteUserAsset(ctx context.Context, assetType string, assetID string, owner string) error {
	logger := log.GetReqLogger(ctx)

	// Delete the user asset
	err := model.DeleteUserAsset(ctx, ctrl.ormDb, assetID, model.RelationType(assetType), owner)
	if err != nil {
		logger.Printf("failed to delete user asset: %v", err)
		return err
	}

	return nil
}
