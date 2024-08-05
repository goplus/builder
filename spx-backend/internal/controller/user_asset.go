package controller

import (
	"context"
	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/model"
)

// AddUserAssetParams holds parameters for adding an user asset.
type AddUserAssetParams struct {
	// AssetID is the identifier for the asset.
	AssetID int `json:"assetId"`
}

// GetUserAssetParams holds parameters for getting an user asset.
type GetUserAssetParams struct {
	// AssetID is the identifier for the asset.
	AssetID int `json:"assetId"`
}

type RelationType string

const (
	Liked    RelationType = "liked"
	History  RelationType = "history"
	Imported RelationType = "imported"
)

// AddUserAsset adds an asset.
func (ctrl *Controller) AddUserAsset(ctx context.Context, params *AddUserAssetParams, assetType RelationType) error {
	logger := log.GetReqLogger(ctx)

	_, err := model.AddUserAsset(ctx, ctrl.db, &model.UserAsset{
		//UserID:            user.ID,
		AssetID:      params.AssetID,
		RelationType: model.RelationType(assetType),
		//RelationTimestamp: params.RelationTimestamp,
	})
	if err != nil {
		logger.Printf("failed to add asset: %v", err)
		return err
	}

	return nil
}

//// GetUserAsset gets user asset with given user id. Returns `ErrNotExist` if it does not exist.
//func (ctrl *Controller) GetUserAsset(ctx context.Context, params *GetUserAssetParams) (*model.UserAsset, error) {
//	return model.UserAssetByUserID(ctx, ctrl.db, userID)
//}

// ListUserAssets lists assets for a specific user with various filter and sort options.
func (ctrl *Controller) ListUserAssets(ctx context.Context, assetType RelationType, params *ListAssetsParams) (*model.ByPage[model.Asset], error) {
	logger := log.GetReqLogger(ctx)

	// Initialize the filter conditions
	var wheres []model.FilterCondition
	wheres = append(wheres, model.FilterCondition{Column: "ua.owner", Operation: "=", Value: params.Owner}, model.FilterCondition{Column: "ua.relation_type", Operation: "=", Value: assetType})

	// Check if the user is not the owner and restrict to public assets
	if user, ok := UserFromContext(ctx); !ok || params.Owner == nil || user.Name != *params.Owner {
		public := model.Public
		params.IsPublic = &public
	}

	// Apply additional filters based on parameters
	if params.Keyword != "" {
		wheres = append(wheres, model.FilterCondition{Column: "a.display_name", Operation: "LIKE", Value: "%" + params.Keyword + "%"})
	}
	if params.Owner != nil {
		wheres = append(wheres, model.FilterCondition{Column: "a.owner", Operation: "=", Value: *params.Owner})
	}
	if params.Category != nil {
		wheres = append(wheres, model.FilterCondition{Column: "a.category", Operation: "=", Value: *params.Category})
	}
	if params.AssetType != nil {
		wheres = append(wheres, model.FilterCondition{Column: "a.asset_type", Operation: "=", Value: *params.AssetType})
	}
	if params.FilesHash != nil {
		wheres = append(wheres, model.FilterCondition{Column: "a.files_hash", Operation: "=", Value: *params.FilesHash})
	}
	if params.IsPublic != nil {
		wheres = append(wheres, model.FilterCondition{Column: "a.is_public", Operation: "=", Value: *params.IsPublic})
	}

	// Define order conditions based on input
	var orders []model.OrderByCondition
	switch params.OrderBy {
	case TimeDesc:
		orders = append(orders, model.OrderByCondition{Column: "a.c_time", Direction: "DESC"})
	case ClickCountDesc:
		orders = append(orders, model.OrderByCondition{Column: "a.click_count", Direction: "DESC"})
	}

	// Use the QueryByPage function to get paginated results
	query := `
		SELECT a.*
		FROM asset a
		JOIN user_asset ua ON a.id = ua.asset_id
		WHERE ua.user_id = ?
	`

	assets, err := model.QueryByPage[model.Asset](ctx, ctrl.db, query, params.Pagination, wheres, orders)
	if err != nil {
		logger.Printf("failed to list user assets: %v", err)
		return nil, err
	}

	return assets, nil
}
