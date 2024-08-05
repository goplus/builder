package model

import (
	"context"
	"database/sql"
	"strconv"
	"time"
)

type UserAsset struct {
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
func AddUserAsset(ctx context.Context, db *sql.DB, p *UserAsset) (*UserAsset, error) {
	return Create(ctx, db, TableUserAsset, p)
}

// UserAssetByUserID gets user asset with given user id. Returns `ErrNotExist` if it does not exist.
func UserAssetByUserID(ctx context.Context, db *sql.DB, userID int) (*UserAsset, error) {
	return QueryByID[UserAsset](ctx, db, TableUserAsset, strconv.Itoa(userID))
}

// UpdateUserAsset updates an user asset.
func UpdateUserAsset(ctx context.Context, db *sql.DB, userID int, item *UserAsset, columns ...string) error {
	return UpdateByID[UserAsset](ctx, db, TableUserAsset, strconv.Itoa(userID), item, columns...)
}

//// DeleteUserAsset deletes an user asset.
//func DeleteUserAsset(ctx context.Context, db *sql.DB, userID int) error {
//	return DeleteByID(ctx, db, TableUserAsset, strconv.Itoa(userID))
//}
