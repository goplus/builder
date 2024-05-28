package model

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
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
	Category string `db:"category" json:"category"`

	// AssetType indicates the type of the asset.
	AssetType AssetType `db:"asset_type" json:"assetType"`

	// Files contains the asset's files.
	Files FileCollection `db:"files" json:"files"`

	// Preview is the URL for the asset preview, e.g., a gif for a sprite.
	Preview string `db:"preview" json:"preview"`

	// ClickCount is the number of clicks on the asset.
	ClickCount int64 `db:"click_count" json:"clickCount"`

	// IsPublic indicates if the asset is public.
	IsPublic IsPublic `db:"is_public" json:"isPublic"`

	// Status indicates if the asset is deleted.
	Status Status `db:"status" json:"status"`
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
	where := []FilterCondition{{Column: "id", Operation: "=", Value: id}}
	return QueryFirst[Asset](ctx, db, TableAsset, where, nil)
}

// ListAssets lists assets with given pagination, where conditions and order by conditions.
func ListAssets(ctx context.Context, db *sql.DB, paginaton Pagination, filters []FilterCondition, orderBy []OrderByCondition) (*ByPage[Asset], error) {
	return QueryByPage[Asset](ctx, db, TableAsset, paginaton, filters, orderBy)
}

// AddAsset adds an asset.
func AddAsset(ctx context.Context, db *sql.DB, a *Asset) (*Asset, error) {
	logger := log.GetReqLogger(ctx)

	now := time.Now().UTC()
	query := fmt.Sprintf("INSERT INTO %s (c_time, u_time, display_name, owner, category, asset_type, files, preview, click_count, is_public, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)", TableAsset)
	result, err := db.ExecContext(ctx, query, now, now, a.DisplayName, a.Owner, a.Category, a.AssetType, a.Files, a.Preview, a.ClickCount, a.IsPublic, StatusNormal)
	if err != nil {
		logger.Printf("db.ExecContext failed: %v", err)
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		logger.Printf("failed to get last insert id: %v", err)
		return nil, err
	}
	return AssetByID(ctx, db, strconv.FormatInt(id, 10))
}

// UpdateAssetByID updates asset with given id.
func UpdateAssetByID(ctx context.Context, db *sql.DB, id string, a *Asset) (*Asset, error) {
	logger := log.GetReqLogger(ctx)

	query := fmt.Sprintf("UPDATE %s SET u_time = ?, display_name = ?, category = ?, asset_type = ?, files = ?, preview = ?, is_public = ? WHERE id = ?", TableAsset)
	result, err := db.ExecContext(ctx, query, time.Now().UTC(), a.DisplayName, a.Category, a.AssetType, a.Files, a.Preview, a.IsPublic, id)
	if err != nil {
		logger.Printf("db.ExecContext failed: %v", err)
		return nil, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		logger.Printf("result.RowsAffected failed: %v", err)
		return nil, err
	} else if rowsAffected == 0 {
		return nil, ErrNotExist
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
	logger := log.GetReqLogger(ctx)
	query := fmt.Sprintf("UPDATE %s SET u_time = ?, status = ? WHERE id = ?", TableAsset)
	if _, err := db.ExecContext(ctx, query, time.Now().UTC(), StatusDeleted, id); err != nil {
		logger.Printf("db.ExecContext failed: %v", err)
		return err
	}
	return nil
}
