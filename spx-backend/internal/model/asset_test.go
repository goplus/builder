package model

import (
	"context"
	"database/sql"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAssetByID(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"display_name"}).
				AddRow("foo"))
		asset, err := AssetByID(context.Background(), db, "1")
		require.NoError(t, err)
		require.NotNil(t, asset)
		assert.Equal(t, "foo", asset.DisplayName)
	})

	t.Run("NotExist", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows(nil))
		asset, err := AssetByID(context.Background(), db, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrNotExist)
		assert.Nil(t, asset)
	})
}

func TestListAssets(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT COUNT\(\*\) FROM asset WHERE status != \?`).
			WillReturnRows(mock.NewRows([]string{"COUNT(*)"}).
				AddRow(1))
		mock.ExpectQuery(`SELECT \* FROM asset WHERE status != \? ORDER BY id ASC LIMIT \?, \?`).
			WillReturnRows(mock.NewRows([]string{"display_name"}).
				AddRow("foo"))
		assets, err := ListAssets(context.Background(), db, Pagination{Index: 1, Size: 1}, nil, nil)
		require.NoError(t, err)
		require.NotNil(t, assets)
		assert.Equal(t, 1, assets.Total)
		assert.Len(t, assets.Data, 1)
		assert.Equal(t, "foo", assets.Data[0].DisplayName)
	})

	t.Run("ClosedConnForCountQuery", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT COUNT\(\*\) FROM asset WHERE status != \?`).
			WillReturnError(sql.ErrConnDone)
		assets, err := ListAssets(context.Background(), db, Pagination{Index: 1, Size: 1}, nil, nil)
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
		assert.Nil(t, assets)
	})
}

func TestAddAsset(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`INSERT INTO asset \(c_time, u_time, display_name, owner, category, asset_type, files, files_hash, preview, click_count, is_public, status\) VALUES \(\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?\)`).
			WillReturnResult(sqlmock.NewResult(1, 1))
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"display_name"}).
				AddRow("foo"))
		asset, err := AddAsset(context.Background(), db, &Asset{DisplayName: "foo"})
		require.NoError(t, err)
		require.NotNil(t, asset)
		assert.Equal(t, "foo", asset.DisplayName)
	})

	t.Run("ClosedConnForInsertQuery", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`INSERT INTO asset \(c_time, u_time, display_name, owner, category, asset_type, files, files_hash, preview, click_count, is_public, status\) VALUES \(\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?\)`).
			WillReturnError(sql.ErrConnDone)
		asset, err := AddAsset(context.Background(), db, &Asset{DisplayName: "foo"})
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
		assert.Nil(t, asset)
	})

	t.Run("ClosedConnForLastInsertID", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`INSERT INTO asset \(c_time, u_time, display_name, owner, category, asset_type, files, files_hash, preview, click_count, is_public, status\) VALUES \(\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?\)`).
			WillReturnResult(sqlmock.NewErrorResult(sql.ErrConnDone))
		asset, err := AddAsset(context.Background(), db, &Asset{DisplayName: "foo"})
		require.Error(t, err)
		assert.Nil(t, asset)
	})
}

func TestUpdateAssetByID(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE asset SET u_time = \?, display_name = \?, category = \?, asset_type = \?, files = \?, files_hash = \?, preview = \?, is_public = \? WHERE id = \?`).
			WillReturnResult(sqlmock.NewResult(1, 1))
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"display_name"}).
				AddRow("foo"))
		asset, err := UpdateAssetByID(context.Background(), db, "1", &Asset{DisplayName: "foo"})
		require.NoError(t, err)
		require.NotNil(t, asset)
		assert.Equal(t, "foo", asset.DisplayName)
	})

	t.Run("NotExist", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE asset SET u_time = \?, display_name = \?, category = \?, asset_type = \?, files = \?, files_hash = \?, preview = \?, is_public = \? WHERE id = \?`).
			WillReturnResult(sqlmock.NewResult(1, 0))
		asset, err := UpdateAssetByID(context.Background(), db, "1", &Asset{DisplayName: "foo"})
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrNotExist)
		assert.Nil(t, asset)
	})

	t.Run("ClosedConnForUpdateQuery", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE asset SET u_time = \?, display_name = \?, category = \?, asset_type = \?, files = \?, files_hash = \?, preview = \?, is_public = \? WHERE id = \?`).
			WillReturnError(sql.ErrConnDone)
		asset, err := UpdateAssetByID(context.Background(), db, "1", &Asset{DisplayName: "foo"})
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
		assert.Nil(t, asset)
	})

	t.Run("ClosedConnForRowsAffected", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE asset SET u_time = \?, display_name = \?, category = \?, asset_type = \?, files = \?, files_hash = \?, preview = \?, is_public = \? WHERE id = \?`).
			WillReturnResult(sqlmock.NewErrorResult(sql.ErrConnDone))
		asset, err := UpdateAssetByID(context.Background(), db, "1", &Asset{DisplayName: "foo"})
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
		assert.Nil(t, asset)
	})
}

func TestIncreaseAssetClickCount(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE asset SET u_time = \?, click_count = click_count \+ 1 WHERE id = \?`).
			WillReturnResult(sqlmock.NewResult(1, 1))
		err = IncreaseAssetClickCount(context.Background(), db, "1")
		require.NoError(t, err)
	})

	t.Run("NotExist", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE asset SET u_time = \?, click_count = click_count \+ 1 WHERE id = \?`).
			WillReturnResult(sqlmock.NewResult(1, 0))
		err = IncreaseAssetClickCount(context.Background(), db, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrNotExist)
	})

	t.Run("ClosedConnForUpdateQuery", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE asset SET u_time = \?, click_count = click_count \+ 1 WHERE id = \?`).
			WillReturnError(sql.ErrConnDone)
		err = IncreaseAssetClickCount(context.Background(), db, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
	})

	t.Run("ClosedConnForRowsAffected", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE asset SET u_time = \?, click_count = click_count \+ 1 WHERE id = \?`).
			WillReturnResult(sqlmock.NewErrorResult(sql.ErrConnDone))
		err = IncreaseAssetClickCount(context.Background(), db, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
	})
}

func TestDeleteAssetByID(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE asset SET u_time = \?, status = \? WHERE id = \?`).
			WillReturnResult(sqlmock.NewResult(1, 1))
		err = DeleteAssetByID(context.Background(), db, "1")
		require.NoError(t, err)
	})

	t.Run("ClosedConnForDeleteQuery", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE asset SET u_time = \?, status = \? WHERE id = \?`).
			WillReturnError(sql.ErrConnDone)
		err = DeleteAssetByID(context.Background(), db, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
	})
}
