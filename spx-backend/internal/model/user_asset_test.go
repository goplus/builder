package model

import (
	"context"
	"database/sql"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
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

func TestListUserAssets(t *testing.T) {
	query := "SELECT a.* FROM asset RIGHT JOIN user_asset ua ON a.id = ua.asset_id"
	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherEqual))
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT COUNT(*) FROM (SELECT a.* FROM asset RIGHT JOIN user_asset ua ON a.id = ua.asset_id WHERE status != ?) AS subquery`).
			WillReturnRows(mock.NewRows([]string{"COUNT(*)"}).
				AddRow(1))
		mock.ExpectQuery(`SELECT a.* FROM asset RIGHT JOIN user_asset ua ON a.id = ua.asset_id WHERE status != ? ORDER BY id ASC LIMIT ?, ?`).
			WillReturnRows(mock.NewRows([]string{"display_name"}).
				AddRow("foo"))
		// Mock the additional query for user_asset table to get liked info
		mock.ExpectQuery(`SELECT asset_id, COUNT(*) as count FROM user_asset WHERE asset_id IN (?) AND relation_type = 'liked' GROUP BY asset_id`).
			WithArgs("").
			WillReturnRows(mock.NewRows([]string{"asset_id", "count"}).AddRow(1, 5))

		assets, err := ListUserAssets(context.Background(), db, Pagination{Index: 1, Size: 1}, nil, nil, query)
		require.NoError(t, err)
		require.NotNil(t, assets)
		assert.Equal(t, 1, assets.Total)
		assert.Len(t, assets.Data, 1)
		assert.Equal(t, "foo", assets.Data[0].DisplayName)
	})

	t.Run("ClosedConnForCountQuery", func(t *testing.T) {
		db, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherEqual))
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT COUNT(*) FROM (SELECT a.* FROM asset RIGHT JOIN user_asset ua ON a.id = ua.asset_id WHERE status != ?) AS subquery`).
			WillReturnError(sql.ErrConnDone)
		assets, err := ListUserAssets(context.Background(), db, Pagination{Index: 1, Size: 1}, nil, nil, query)
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
		assert.Nil(t, assets)
	})
}
