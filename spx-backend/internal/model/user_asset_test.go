package model

import (
	"context"
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"testing"
)

func TestAddUserAsset(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {

		db, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherEqual))
		require.NoError(t, err)
		defer db.Close()

		gdb, err := gorm.Open(mysql.New(mysql.Config{
			Conn:                      db,
			SkipInitializeWithVersion: true,
		}), &gorm.Config{})
		require.NoError(t, err)

		mock.ExpectBegin()
		mock.ExpectExec("INSERT INTO `user_assets` (`owner`,`asset_id`,`relation_type`,`relation_timestamp`) VALUES (?,?,?,?)").
			WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg()).
			WillReturnResult(sqlmock.NewResult(1, 1))
		mock.ExpectCommit()

		asset := &UserAsset{
			AssetID:      1,
			RelationType: "owned",
			Owner:        "user1",
		}

		err = AddUserAsset(context.Background(), gdb, asset)
		require.NoError(t, err)
		assert.Equal(t, 1, asset.ID)

		err = mock.ExpectationsWereMet()
		require.NoError(t, err)
	})

	t.Run("AddFailed", func(t *testing.T) {
		db, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherEqual))
		require.NoError(t, err)
		defer db.Close()

		gdb, err := gorm.Open(mysql.New(mysql.Config{
			Conn:                      db,
			SkipInitializeWithVersion: true}), &gorm.Config{})
		require.NoError(t, err)

		mock.ExpectBegin()
		mock.ExpectExec("INSERT INTO `user_assets` (`owner`,`asset_id`,`relation_type`,`relation_timestamp`) VALUES (?,?,?,?)").
			WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg()).
			WillReturnError(gorm.ErrInvalidDB)
		mock.ExpectRollback()

		asset := &UserAsset{
			AssetID:      1,
			RelationType: "owned",
			Owner:        "user1",
		}

		err = AddUserAsset(context.Background(), gdb, asset)
		require.Error(t, err)
		assert.Equal(t, gorm.ErrInvalidDB, err)

		err = mock.ExpectationsWereMet()
		require.NoError(t, err)
	})
}

func TestDeleteUserAsset(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherEqual))
		require.NoError(t, err)
		defer db.Close()

		gdb, err := gorm.Open(mysql.New(mysql.Config{
			Conn:                      db,
			SkipInitializeWithVersion: true}), &gorm.Config{})
		require.NoError(t, err)
		assetID := "1"
		assetType := "owned"
		owner := "user1"

		mock.ExpectBegin()
		mock.ExpectExec("DELETE FROM `user_assets` WHERE asset_id = ? AND relation_type = ? AND owner = ?").
			WithArgs(1, assetType, owner).
			WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectCommit()

		err = DeleteUserAsset(context.Background(), gdb, assetID, RelationType(assetType), owner)
		require.NoError(t, err)

		err = mock.ExpectationsWereMet()
		require.NoError(t, err)
	})

	t.Run("DeleteFailed", func(t *testing.T) {
		db, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherEqual))
		require.NoError(t, err)
		defer db.Close()

		gdb, err := gorm.Open(mysql.New(mysql.Config{
			Conn:                      db,
			SkipInitializeWithVersion: true}), &gorm.Config{})
		require.NoError(t, err)
		assetID := "1"
		assetType := "owned"
		owner := "user1"

		mock.ExpectBegin()
		mock.ExpectExec("DELETE FROM `user_assets` WHERE asset_id = ? AND relation_type = ? AND owner = ?").
			WithArgs(1, assetType, owner).
			WillReturnError(gorm.ErrInvalidDB)
		mock.ExpectRollback()

		err = DeleteUserAsset(context.Background(), gdb, assetID, RelationType(assetType), owner)
		require.Error(t, err)
		assert.Equal(t, gorm.ErrInvalidDB, err)

		err = mock.ExpectationsWereMet()
		require.NoError(t, err)
	})
}
