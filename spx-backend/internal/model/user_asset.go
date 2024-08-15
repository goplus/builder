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
	result := db.Create(p)
	if result.Error != nil {
		logger.Printf("failed to add asset: %v", result.Error)
		return result.Error
	}

	logger.Printf("added asset: %v", p)
	return nil
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
