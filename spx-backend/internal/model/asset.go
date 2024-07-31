package model

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/goplus/builder/spx-backend/internal/log"
)

// Asset is the model for an asset.
type Asset struct {
	// ID is the globally unique identifier.
	ID string `db:"id" json:"id"`

	// CTime is the creation time.
	CTime time.Time `db:"c_time" json:"cTime"`

	// UTime is the last update time.
	UTime time.Time `db:"u_time" json:"uTime"`

	// DisplayName is the name to display.
	DisplayName string `db:"display_name" json:"displayName"`

	// Owner is the name of the asset owner.
	Owner string `db:"owner" json:"owner"`

	// Category is the asset category.
	Category map[string][]string `db:"category" json:"category"`

	// AssetType indicates the type of the asset.
	AssetType AssetType `db:"asset_type" json:"assetType"`

	// Files contains the asset's files.
	Files FileCollection `db:"files" json:"files"`

	// FilesHash is the hash of the asset's files.
	FilesHash string `db:"files_hash" json:"filesHash"`

	// Preview is the URL for the asset preview, e.g., a gif for a sprite.
	Preview string `db:"preview" json:"preview"`

	// ClickCount is the number of clicks on the asset.
	ClickCount int64 `db:"click_count" json:"clickCount"`

	// IsPublic indicates if the asset is public.
	IsPublic IsPublic `db:"is_public" json:"isPublic"`

	// Status indicates if the asset is deleted.
	Status Status `db:"status" json:"status"`

	// IsLiked indicates if the asset is liked.
	IsLiked bool `json:"isLiked"`

	// LikeCount is the number of likes on the asset.
	LikeCount int `json:"likedCount"`
}

// TableAsset is the table name of [Asset] in database.
const TableAsset = "asset"

// AssetType is the type of asset.
type AssetType int

const (
	AssetTypeSprite AssetType = iota
	AssetTypeBackdrop
	AssetTypeSound
)

// AssetByID gets asset with given id. Returns `ErrNotExist` if it does not exist.
func AssetByID(ctx context.Context, db *sql.DB, id string) (*Asset, error) {
	return QueryByID[Asset](ctx, db, TableAsset, id)
}

// ListAssets lists assets with given pagination, where conditions and order by conditions.
func ListAssets(ctx context.Context, db *sql.DB, paginaton Pagination, filters []FilterCondition, orderBy []OrderByCondition) (*ByPage[Asset], error) {
	logger := log.GetReqLogger(ctx)
	assets, err := QueryByPage[Asset](ctx, db, TableAsset, paginaton, filters, orderBy, false)
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

// extractAssetIDs extracts asset IDs from assets.
func extractAssetIDs(assets []Asset) []string {
	assetIDs := make([]string, len(assets))
	for i, asset := range assets {
		assetIDs[i] = asset.ID
	}
	return assetIDs
}

// fillLikedInfo 填充 Asset 数据的 IsLiked 和 LikeCount 属性
func fillLikedInfo(assets []Asset, likedMap map[string]struct {
	IsLiked   bool
	LikeCount int
}) {
	for i, asset := range assets {
		if liked, ok := likedMap[asset.ID]; ok {
			assets[i].IsLiked = liked.IsLiked
			assets[i].LikeCount = liked.LikeCount
		} else {
			assets[i].IsLiked = false
			assets[i].LikeCount = 0
		}
	}
}

// AddAsset adds an asset.
func AddAsset(ctx context.Context, db *sql.DB, a *Asset) (*Asset, error) {
	return Create(ctx, db, TableAsset, a)
}

// UpdateAssetByID updates asset with given id.
func UpdateAssetByID(ctx context.Context, db *sql.DB, id string, a *Asset) (*Asset, error) {
	logger := log.GetReqLogger(ctx)
	if err := UpdateByID(ctx, db, TableAsset, id, a, "display_name", "category", "asset_type", "files", "files_hash", "preview", "is_public"); err != nil {
		logger.Printf("UpdateByID failed: %v", err)
		return nil, err
	}
	return AssetByID(ctx, db, id)
}

// IncreaseAssetClickCount increases asset's click count by 1.
func IncreaseAssetClickCount(ctx context.Context, db *sql.DB, id string) error {
	logger := log.GetReqLogger(ctx)

	query := fmt.Sprintf("UPDATE %s SET u_time = ?, click_count = click_count + 1 WHERE id = ?", TableAsset)
	result, err := db.ExecContext(ctx, query, time.Now().UTC(), id)
	if err != nil {
		logger.Printf("db.ExecContext failed: %v", err)
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		logger.Printf("result.RowsAffected failed: %v", err)
		return err
	} else if rowsAffected == 0 {
		return ErrNotExist
	}
	return nil
}

// DeleteAssetByID deletes asset with given id.
func DeleteAssetByID(ctx context.Context, db *sql.DB, id string) error {
	return UpdateByID(ctx, db, TableAsset, id, &Asset{Status: StatusDeleted}, "status")
}
