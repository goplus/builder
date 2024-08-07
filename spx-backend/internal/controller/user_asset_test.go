package controller

import (
	"context"
	"testing"

	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestController_ListUserAssetsAssets(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		paramsOwner := "fake-name"
		paramsCategory := "boy"
		paramsAssetType := model.AssetTypeSprite
		paramsFilesHash := "fake-files-hash"
		paramsIsPublic := model.Personal
		params := &ListAssetsParams{
			Keyword:    "fake",
			Owner:      &paramsOwner,
			Category:   &paramsCategory,
			AssetType:  &paramsAssetType,
			FilesHash:  &paramsFilesHash,
			IsPublic:   &paramsIsPublic,
			OrderBy:    DefaultOrder,
			Pagination: model.Pagination{Index: 1, Size: 10},
		}

		mock.ExpectQuery(`SELECT COUNT\(\*\) FROM \(\s*SELECT a\.\* FROM asset a JOIN user_asset ua ON a\.id = ua\.asset_id WHERE ua\.owner = \? AND ua\.relation_type = \? AND a\.display_name LIKE \? AND a\.owner = \? AND ua\.user_id = \? AND a\.category = \? AND a\.asset_type = \? AND a\.files_hash = \? AND a\.is_public = \? AND status != \?\s*\) AS subquery`).
			WithArgs(paramsOwner, "liked", "%"+params.Keyword+"%", paramsOwner, ctx.Value("userID"), paramsCategory, paramsAssetType, paramsFilesHash, paramsIsPublic, model.StatusDeleted).
			WillReturnRows(mock.NewRows([]string{"COUNT(1)"}).
				AddRow(1))

		mock.ExpectQuery(`SELECT a\.\* FROM asset a JOIN user_asset ua ON a\.id = ua\.asset_id WHERE ua\.owner = \? AND ua\.relation_type = \? AND a\.display_name LIKE \? AND a\.owner = \? AND ua\.user_id = \? AND a\.category = \? AND a\.asset_type = \? AND a\.files_hash = \? AND a\.is_public = \? AND status != \? ORDER BY a\.id ASC LIMIT \?, \?`).
			WithArgs(paramsOwner, "liked", "%"+params.Keyword+"%", paramsOwner, ctx.Value("userID"), paramsCategory, paramsAssetType, paramsFilesHash, paramsIsPublic, model.StatusDeleted, 0, 10).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner"}).
				AddRow(1, "fake-asset", "fake-name"))

		assets, err := ctrl.ListUserAssets(ctx, "liked", params)
		require.NoError(t, err)
		require.NotNil(t, assets)
		assert.Len(t, assets.Data, 1)
		assert.Equal(t, "1", assets.Data[0].ID)
	})

	t.Run("NoUser", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := context.Background()
		paramsOwner := "fake-name"
		paramsCategory := "boy"
		paramsAssetType := model.AssetTypeSprite
		paramsFilesHash := "fake-files-hash"
		paramsIsPublic := model.Personal
		params := &ListAssetsParams{
			Keyword:    "fake",
			Owner:      &paramsOwner,
			Category:   &paramsCategory,
			AssetType:  &paramsAssetType,
			FilesHash:  &paramsFilesHash,
			IsPublic:   &paramsIsPublic,
			OrderBy:    TimeDesc,
			Pagination: model.Pagination{Index: 1, Size: 10},
		}
		mock.ExpectQuery(`SELECT COUNT\(\*\) FROM asset WHERE display_name LIKE \? AND owner = \? AND category = \? AND asset_type = \? AND files_hash = \? AND is_public = \? AND status != \?`).
			WithArgs("%"+params.Keyword+"%", params.Owner, params.Category, params.AssetType, params.FilesHash, params.IsPublic, model.StatusDeleted).
			WillReturnRows(mock.NewRows([]string{"COUNT(1)"}).
				AddRow(1))
		mock.ExpectQuery(`SELECT \* FROM asset WHERE display_name LIKE \? AND owner = \? AND category = \? AND asset_type = \? AND files_hash = \? AND is_public = \? AND status != \? ORDER BY c_time DESC LIMIT \?, \?`).
			WithArgs("%"+params.Keyword+"%", params.Owner, params.Category, params.AssetType, params.FilesHash, params.IsPublic, model.StatusDeleted, 0, 10).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner"}).
				AddRow(1, "fake-asset", "fake-name"))
		assets, err := ctrl.ListAssets(ctx, params)
		require.NoError(t, err)
		require.NotNil(t, assets)
		assert.Len(t, assets.Data, 1)
		assert.Equal(t, "1", assets.Data[0].ID)
	})

	t.Run("NoOwner", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		paramsCategory := "boy"
		paramsAssetType := model.AssetTypeSprite
		paramsFilesHash := "fake-files-hash"
		paramsIsPublic := model.Personal
		params := &ListAssetsParams{
			Keyword:    "fake",
			Category:   &paramsCategory,
			AssetType:  &paramsAssetType,
			FilesHash:  &paramsFilesHash,
			IsPublic:   &paramsIsPublic,
			OrderBy:    ClickCountDesc,
			Pagination: model.Pagination{Index: 1, Size: 10},
		}
		mock.ExpectQuery(`SELECT COUNT\(\*\) FROM asset WHERE display_name LIKE \? AND category = \? AND asset_type = \? AND files_hash = \? AND is_public = \? AND status != \?`).
			WithArgs("%"+params.Keyword+"%", params.Category, params.AssetType, params.FilesHash, params.IsPublic, model.StatusDeleted).
			WillReturnRows(mock.NewRows([]string{"COUNT(1)"}).
				AddRow(1))
		mock.ExpectQuery(`SELECT \* FROM asset WHERE display_name LIKE \? AND category = \? AND asset_type = \? AND files_hash = \? AND is_public = \? AND status != \? ORDER BY click_count DESC LIMIT \?, \?`).
			WithArgs("%"+params.Keyword+"%", params.Category, params.AssetType, params.FilesHash, params.IsPublic, model.StatusDeleted, 0, 10).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner"}).
				AddRow(1, "fake-asset", "fake-name"))
		assets, err := ctrl.ListAssets(ctx, params)
		require.NoError(t, err)
		require.NotNil(t, assets)
		assert.Len(t, assets.Data, 1)
		assert.Equal(t, "1", assets.Data[0].ID)
	})

	t.Run("DifferentOwner", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		paramsOwner := "another-fake-name"
		paramsCategory := "boy"
		paramsAssetType := model.AssetTypeSprite
		paramsFilesHash := "fake-files-hash"
		paramsIsPublic := model.Personal
		params := &ListAssetsParams{
			Keyword:    "fake",
			Owner:      &paramsOwner,
			Category:   &paramsCategory,
			AssetType:  &paramsAssetType,
			FilesHash:  &paramsFilesHash,
			IsPublic:   &paramsIsPublic,
			OrderBy:    DefaultOrder,
			Pagination: model.Pagination{Index: 1, Size: 10},
		}
		mock.ExpectQuery(`SELECT COUNT\(\*\) FROM asset WHERE display_name LIKE \? AND owner = \? AND category = \? AND asset_type = \? AND files_hash = \? AND is_public = \? AND status != \?`).
			WithArgs("%"+params.Keyword+"%", params.Owner, params.Category, params.AssetType, params.FilesHash, params.IsPublic, model.StatusDeleted).
			WillReturnRows(mock.NewRows([]string{"COUNT(1)"}).
				AddRow(1))
		mock.ExpectQuery(`SELECT \* FROM asset WHERE display_name LIKE \? AND owner = \? AND category = \? AND asset_type = \? AND files_hash = \? AND is_public = \? AND status != \? ORDER BY id ASC LIMIT \?, \?`).
			WithArgs("%"+params.Keyword+"%", params.Owner, params.Category, params.AssetType, params.FilesHash, params.IsPublic, model.StatusDeleted, 0, 10).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner"}).
				AddRow(1, "fake-asset", "another-fake-name"))
		assets, err := ctrl.ListAssets(ctx, params)
		require.NoError(t, err)
		require.NotNil(t, assets)
		assert.Len(t, assets.Data, 1)
		assert.Equal(t, "1", assets.Data[0].ID)
	})

	t.Run("ClosedDB", func(t *testing.T) {
		ctrl, _, err := newTestController(t)
		require.NoError(t, err)
		ctrl.db.Close()

		ctx := newContextWithTestUser(context.Background())
		paramsOwner := "fake-name"
		paramsCategory := "fake-category"
		paramsAssetType := model.AssetTypeSprite
		paramsFilesHash := "fake-files-hash"
		paramsIsPublic := model.Personal
		params := &ListAssetsParams{
			Keyword:    "fake",
			Owner:      &paramsOwner,
			Category:   &paramsCategory,
			AssetType:  &paramsAssetType,
			FilesHash:  &paramsFilesHash,
			IsPublic:   &paramsIsPublic,
			OrderBy:    DefaultOrder,
			Pagination: model.Pagination{Index: 1, Size: 10},
		}
		_, err = ctrl.ListAssets(ctx, params)
		require.Error(t, err)
		assert.EqualError(t, err, "sql: database is closed")
	})
}
