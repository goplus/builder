package model

import (
	"context"
	"database/sql"
	"strconv"
	"time"

	"github.com/goplus/builder/spx-backend/internal/log"
	"gorm.io/gorm"
)

type UserAsset struct {
	// ID is the identifier for the user asset.
	ID int `db:"id" json:"id"`
	// Owner is the identifier for the user.
	Owner string `db:"owner" json:"owner"`

	// AssetID is the identifier for the asset.
	AssetID int `db:"asset_id" json:"assetId"`

	// RelationType indicates the type of relationship the user has with the asset.
	RelationType RelationType `db:"relation_type" json:"relationType"`

	// RelationTimestamp is the timestamp when the relationship was created or last modified.
	RelationTimestamp time.Time `db:"relation_timestamp" json:"relationTimestamp"`
}

type RelationType string

const (
	Liked    RelationType = "liked"
	History  RelationType = "history"
	Imported RelationType = "imported"
)

// TableUserAsset is the table name of [Asset] in database.
const TableUserAsset = "user_asset"

// AddUserAsset adds an asset.
func AddUserAsset(ctx context.Context, db *gorm.DB, p *UserAsset) error {
	logger := log.GetReqLogger(ctx)

	// check if the asset already exists
	var count int64
	result := db.Model(&UserAsset{}).Where("asset_id = ? AND relation_type = ? AND owner = ?", p.AssetID, p.RelationType, p.Owner).Count(&count)
	if result.Error != nil {
		logger.Printf("failed to check if asset exists: %v", result.Error)
		return result.Error
	}

	if count > 0 {
		return nil
	}

	result = db.Create(p)
	if result.Error != nil {
		logger.Printf("failed to add asset: %v", result.Error)
		return result.Error
	}
	return nil
}

// ListUserAssets lists assets with given pagination, where conditions and order by conditions.
func ListUserAssets(ctx context.Context, db *sql.DB, paginaton Pagination, filters []FilterCondition, orderBy []OrderByCondition, query string) (*ByPage[Asset], error) {
	logger := log.GetReqLogger(ctx)
	assets, err := QueryByPage[Asset](ctx, db, query, paginaton, filters, orderBy, true, nil)
	if err != nil {
		logger.Printf("QueryByPage failed: %v", err)
		return nil, err
	}
	assetIDs := extractAssetIDs(assets.Data)

	likedMap, err := getLikedInfo(ctx, db, assetIDs)
	if err != nil {
		logger.Printf("getLikedInfo failed: %v", err)
		return nil, err
	}

	fillLikedInfo(assets.Data, likedMap)

	return assets, nil

}

// DeleteUserAsset deletes an asset.
func DeleteUserAsset(ctx context.Context, db *gorm.DB, assetId string, assetType RelationType, owner string) error {
	logger := log.GetReqLogger(ctx)
	assetIdInt, _ := strconv.Atoi(assetId)
	result := db.Delete(&UserAsset{}, "asset_id = ? AND relation_type = ? AND owner = ?", assetIdInt, assetType, owner)
	if result.Error != nil {
		logger.Printf("failed to delete user asset by id: %v", result.Error)
		return result.Error
	}
	logger.Printf("deleted user asset by id: %v", result.RowsAffected)
	return nil
}
