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
		// Mock the additional query for user_asset table to get liked info
		mock.ExpectQuery(`SELECT asset_id, COUNT\(\*\) as count FROM user_asset WHERE asset_id IN \(\?\) AND relation_type = 'liked' GROUP BY asset_id`).
			WithArgs("").
			WillReturnRows(mock.NewRows([]string{"asset_id", "count"}).AddRow(1, 5))

		assets, err := ListAssets(context.Background(), db, Pagination{Index: 1, Size: 1}, nil, nil, nil)
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
		assets, err := ListAssets(context.Background(), db, Pagination{Index: 1, Size: 1}, nil, nil, nil)
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

		mock.ExpectExec(`INSERT INTO asset \(.+\) VALUES \(\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?\)`).
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

		mock.ExpectExec(`INSERT INTO asset \(.+\) VALUES \(\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?\)`).
			WillReturnError(sql.ErrConnDone)
		asset, err := AddAsset(context.Background(), db, &Asset{DisplayName: "foo"})
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
		assert.Nil(t, asset)
	})
}

func TestUpdateAssetByID(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE asset SET u_time=\?,display_name=\?,category=\?,asset_type=\?,files=\?,files_hash=\?,preview=\?,is_public=\? WHERE id=\?`).
			WithArgs(sqlmock.AnyArg(), "foo", sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), "1").
			WillReturnResult(sqlmock.NewResult(1, 1))
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"display_name"}).
				AddRow("foo"))
		asset, err := UpdateAssetByID(context.Background(), db, "1", &Asset{DisplayName: "foo"})
		require.NoError(t, err)
		require.NotNil(t, asset)
		assert.Equal(t, "foo", asset.DisplayName)
	})

	t.Run("ClosedConnForUpdateQuery", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE asset SET u_time=\?,display_name=\?,category=\?,asset_type=\?,files=\?,files_hash=\?,preview=\?,is_public=\? WHERE id=\?`).
			WithArgs(sqlmock.AnyArg(), "foo", sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), "1").
			WillReturnError(sql.ErrConnDone)
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
			WithArgs(sqlmock.AnyArg(), "1").
			WillReturnResult(sqlmock.NewResult(1, 1))
		err = IncreaseAssetClickCount(context.Background(), db, "1")
		require.NoError(t, err)
	})

	t.Run("NotExist", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE asset SET u_time = \?, click_count = click_count \+ 1 WHERE id = \?`).
			WithArgs(sqlmock.AnyArg(), "1").
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
			WithArgs(sqlmock.AnyArg(), "1").
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
			WithArgs(sqlmock.AnyArg(), "1").
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

		mock.ExpectExec(`UPDATE asset SET u_time=\?,status=\? WHERE id=\?`).
			WithArgs(sqlmock.AnyArg(), StatusDeleted, "1").
			WillReturnResult(sqlmock.NewResult(1, 1))
		err = DeleteAssetByID(context.Background(), db, "1")
		require.NoError(t, err)
	})

	t.Run("ClosedConnForDeleteQuery", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE asset SET u_time=\?,status=\? WHERE id=\?`).
			WithArgs(sqlmock.AnyArg(), StatusDeleted, "1").
			WillReturnError(sql.ErrConnDone)
		err = DeleteAssetByID(context.Background(), db, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
	})
}

func TestExtractAssetIDs(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		assets := []Asset{
			{ID: "1"},
			{ID: "2"},
			{ID: "3"},
		}

		expected := []string{"1", "2", "3"}
		result := extractAssetIDs(assets)

		assert.Equal(t, expected, result)
	})

	t.Run("EmptyAssets", func(t *testing.T) {
		assets := []Asset{}

		expected := []string{}
		result := extractAssetIDs(assets)

		assert.Equal(t, expected, result)
	})
}

func TestFillLikedInfo(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		assets := []Asset{
			{ID: "1"},
			{ID: "2"},
			{ID: "3"},
		}

		likedMap := map[string]struct {
			IsLiked   bool
			LikeCount int
		}{
			"1": {IsLiked: true, LikeCount: 5},
			"3": {IsLiked: true, LikeCount: 10},
		}

		expected := []Asset{
			{ID: "1", IsLiked: true, LikeCount: 5},
			{ID: "2", IsLiked: false, LikeCount: 0},
			{ID: "3", IsLiked: true, LikeCount: 10},
		}

		fillLikedInfo(assets, likedMap)

		assert.Equal(t, expected, assets)
	})

	t.Run("NoLikedInfo", func(t *testing.T) {
		assets := []Asset{
			{ID: "1"},
			{ID: "2"},
		}

		likedMap := map[string]struct {
			IsLiked   bool
			LikeCount int
		}{}

		expected := []Asset{
			{ID: "1", IsLiked: false, LikeCount: 0},
			{ID: "2", IsLiked: false, LikeCount: 0},
		}

		fillLikedInfo(assets, likedMap)

		assert.Equal(t, expected, assets)
	})

	t.Run("EmptyAssets", func(t *testing.T) {
		assets := []Asset{}
		likedMap := map[string]struct {
			IsLiked   bool
			LikeCount int
		}{
			"1": {IsLiked: true, LikeCount: 5},
		}

		expected := []Asset{}

		fillLikedInfo(assets, likedMap)

		assert.Equal(t, expected, assets)
	})
}
