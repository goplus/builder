package controller

import (
	"context"
	"database/sql"
	"strings"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestControllerEnsureAsset(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner"}).
				AddRow(1, "fake-asset", "fake-name"))
		asset, err := ctrl.ensureAsset(ctx, "1", false)
		require.NoError(t, err)
		require.NotNil(t, asset)
		assert.Equal(t, "1", asset.ID)
	})

	t.Run("NoAsset", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows(nil))
		_, err = ctrl.ensureAsset(ctx, "1", false)
		require.Error(t, err)
		assert.ErrorIs(t, err, model.ErrNotExist)
	})

	t.Run("NoUser", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := context.Background()
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner"}).
				AddRow(1, "fake-asset", "fake-name"))
		_, err = ctrl.ensureAsset(ctx, "1", false)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnauthorized)
	})

	t.Run("NoUserWithPublicAsset", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := context.Background()
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner", "is_public"}).
				AddRow(1, "fake-asset", "fake-name", model.Public))
		asset, err := ctrl.ensureAsset(ctx, "1", false)
		require.NoError(t, err)
		require.NotNil(t, asset)
		assert.Equal(t, "1", asset.ID)
	})

	t.Run("NoUserWithPublicAssetButCheckOwner", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := context.Background()
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner", "is_public"}).
				AddRow(1, "fake-asset", "fake-name", model.Public))
		_, err = ctrl.ensureAsset(ctx, "1", true)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnauthorized)
	})

	t.Run("NoUserWithPersonalAsset", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := context.Background()
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner", "is_public"}).
				AddRow(1, "fake-asset", "fake-name", model.Personal))
		_, err = ctrl.ensureAsset(ctx, "1", false)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnauthorized)
	})
}

func TestControllerGetAsset(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner"}).
				AddRow(1, "fake-asset", "fake-name"))
		asset, err := ctrl.GetAsset(ctx, "1")
		require.NoError(t, err)
		require.NotNil(t, asset)
		assert.Equal(t, "1", asset.ID)
	})

	t.Run("NoAsset", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows(nil))
		_, err = ctrl.GetAsset(ctx, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, model.ErrNotExist)
	})
}

func TestListAssetsParamsValidate(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		paramsOwner := "fake-name"
		paramsCategory := "fake-category"
		paramsAssetType := model.AssetTypeSprite
		paramsIsPublic := model.Personal
		params := &ListAssetsParams{
			Keyword:    "fake",
			Owner:      &paramsOwner,
			Category:   &paramsCategory,
			AssetType:  &paramsAssetType,
			IsPublic:   &paramsIsPublic,
			OrderBy:    DefaultOrder,
			Pagination: model.Pagination{Index: 1, Size: 10},
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})
}

func TestControllerListAssets(t *testing.T) {
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
		mock.ExpectQuery(`SELECT COUNT\(\*\) FROM asset WHERE display_name LIKE \? AND owner = \? AND category = \? AND asset_type = \? AND files_hash = \? AND is_public = \? AND status != \?`).
			WithArgs("%"+params.Keyword+"%", params.Owner, params.Category, model.AssetTypeSprite, params.FilesHash, model.Personal, model.StatusDeleted).
			WillReturnRows(mock.NewRows([]string{"COUNT(1)"}).
				AddRow(1))
		mock.ExpectQuery(`SELECT \* FROM asset WHERE display_name LIKE \? AND owner = \? AND category = \? AND asset_type = \? AND files_hash = \? AND is_public = \? AND status != \? ORDER BY id ASC LIMIT \?, \? `).
			WithArgs("%"+params.Keyword+"%", params.Owner, params.Category, model.AssetTypeSprite, params.FilesHash, model.Personal, model.StatusDeleted, 0, 10).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner"}).
				AddRow(1, "fake-asset", "fake-name"))
		assets, err := ctrl.ListAssets(ctx, params)
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
			WithArgs("%"+params.Keyword+"%", params.Owner, params.Category, model.AssetTypeSprite, params.FilesHash, model.Public, model.StatusDeleted).
			WillReturnRows(mock.NewRows([]string{"COUNT(1)"}).
				AddRow(1))
		mock.ExpectQuery(`SELECT \* FROM asset WHERE display_name LIKE \? AND owner = \? AND category = \? AND asset_type = \? AND files_hash = \? AND is_public = \? AND status != \? ORDER BY c_time DESC LIMIT \?, \? `).
			WithArgs("%"+params.Keyword+"%", params.Owner, params.Category, model.AssetTypeSprite, params.FilesHash, model.Public, model.StatusDeleted, 0, 10).
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
			WithArgs("%"+params.Keyword+"%", params.Category, model.AssetTypeSprite, params.FilesHash, model.Public, model.StatusDeleted).
			WillReturnRows(mock.NewRows([]string{"COUNT(1)"}).
				AddRow(1))
		mock.ExpectQuery(`SELECT \* FROM asset WHERE display_name LIKE \? AND category = \? AND asset_type = \? AND files_hash = \? AND is_public = \? AND status != \? ORDER BY click_count DESC LIMIT \?, \? `).
			WithArgs("%"+params.Keyword+"%", params.Category, model.AssetTypeSprite, params.FilesHash, model.Public, model.StatusDeleted, 0, 10).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner"}).
				AddRow(1, "fake-asset", "fake-name"))
		assets, err := ctrl.ListAssets(ctx, params)
		require.NoError(t, err)
		require.NotNil(t, assets)
		assert.Len(t, assets.Data, 1)
		assert.Equal(t, "1", assets.Data[0].ID)
	})

	//t.Run("multiCategory", func(t *testing.T) {
	//	ctrl, mock, err := newTestController(t)
	//	require.NoError(t, err)
	//
	//	ctx := newContextWithTestUser(context.Background())
	//	paramsCategory := "cartoon_characters"
	//	paramsAssetType := model.AssetTypeSprite
	//	paramsFilesHash := "fake-files-hash"
	//	paramsIsPublic := model.Personal
	//	params := &ListAssetsParams{
	//		Keyword:    "fake",
	//		Category:   &paramsCategory,
	//		AssetType:  &paramsAssetType,
	//		FilesHash:  &paramsFilesHash,
	//		IsPublic:   &paramsIsPublic,
	//		OrderBy:    ClickCountDesc,
	//		Pagination: model.Pagination{Index: 1, Size: 10},
	//	}
	//	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM asset WHERE display_name LIKE \? AND category = \? AND asset_type = \? AND files_hash = \? AND is_public = \? AND status != \?`).
	//		WithArgs("%"+params.Keyword+"%", params.Category, model.AssetTypeSprite, params.FilesHash, model.Public, model.StatusDeleted).
	//		WillReturnRows(mock.NewRows([]string{"COUNT(1)"}).
	//			AddRow(1))
	//	mock.ExpectQuery(`SELECT \* FROM asset WHERE display_name LIKE \? AND category = \? AND asset_type = \? AND files_hash = \? AND is_public = \? AND status != \? ORDER BY click_count DESC LIMIT \?, \? `).
	//		WithArgs("%"+params.Keyword+"%", params.Category, model.AssetTypeSprite, params.FilesHash, model.Public, model.StatusDeleted, 0, 10).
	//		WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner"}).
	//			AddRow(1, "fake-asset", "fake-name"))
	//	assets, err := ctrl.ListAssets(ctx, params)
	//	require.NoError(t, err)
	//	require.NotNil(t, assets)
	//	assert.Len(t, assets.Data, 1)
	//	assert.Equal(t, "1", assets.Data[0].ID)
	//})

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
			WithArgs("%"+params.Keyword+"%", params.Owner, params.Category, model.AssetTypeSprite, params.FilesHash, model.Public, model.StatusDeleted).
			WillReturnRows(mock.NewRows([]string{"COUNT(1)"}).
				AddRow(1))
		mock.ExpectQuery(`SELECT \* FROM asset WHERE display_name LIKE \? AND owner = \? AND category = \? AND asset_type = \? AND files_hash = \? AND is_public = \? AND status != \? ORDER BY id ASC LIMIT \?, \? `).
			WithArgs("%"+params.Keyword+"%", params.Owner, params.Category, model.AssetTypeSprite, params.FilesHash, model.Public, model.StatusDeleted, 0, 10).
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

func TestAddAssetParamsValidate(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		params := &AddAssetParams{
			DisplayName: "fake-display-name",
			Owner:       "fake-owner",
			Category:    "fake-category",
			AssetType:   model.AssetTypeSprite,
			Files:       model.FileCollection{},
			FilesHash:   "fake-files-hash",
			Preview:     "fake-preview",
			IsPublic:    model.Personal,
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("EmptyDisplayName", func(t *testing.T) {
		params := &AddAssetParams{
			DisplayName: "",
			Owner:       "fake-owner",
			Category:    "fake-category",
			AssetType:   model.AssetTypeSprite,
			Files:       model.FileCollection{},
			FilesHash:   "fake-files-hash",
			Preview:     "fake-preview",
			IsPublic:    model.Personal,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing displayName", msg)
	})

	t.Run("InvalidDisplayName", func(t *testing.T) {
		params := &AddAssetParams{
			DisplayName: strings.Repeat("fake-asset", 11),
			Owner:       "fake-owner",
			Category:    "fake-category",
			AssetType:   model.AssetTypeSprite,
			Files:       model.FileCollection{},
			FilesHash:   "fake-files-hash",
			Preview:     "fake-preview",
			IsPublic:    model.Personal,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid displayName", msg)
	})

	t.Run("EmptyOwner", func(t *testing.T) {
		params := &AddAssetParams{
			DisplayName: "fake-display-name",
			Owner:       "",
			Category:    "fake-category",
			AssetType:   model.AssetTypeSprite,
			Files:       model.FileCollection{},
			FilesHash:   "fake-files-hash",
			Preview:     "fake-preview",
			IsPublic:    model.Personal,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing owner", msg)
	})

	t.Run("EmptyCategory", func(t *testing.T) {
		params := &AddAssetParams{
			DisplayName: "fake-display-name",
			Owner:       "fake-owner",
			Category:    "",
			AssetType:   model.AssetTypeSprite,
			Files:       model.FileCollection{},
			FilesHash:   "fake-files-hash",
			Preview:     "fake-preview",
			IsPublic:    model.Personal,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing category", msg)
	})

	t.Run("InvalidAssetType", func(t *testing.T) {
		params := &AddAssetParams{
			DisplayName: "fake-display-name",
			Owner:       "fake-owner",
			Category:    "fake-category",
			AssetType:   -1,
			Files:       model.FileCollection{},
			FilesHash:   "fake-files-hash",
			Preview:     "fake-preview",
			IsPublic:    model.Personal,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid assetType", msg)
	})

	t.Run("EmptyFilesHash", func(t *testing.T) {
		params := &AddAssetParams{
			DisplayName: "fake-display-name",
			Owner:       "fake-owner",
			Category:    "fake-category",
			AssetType:   model.AssetTypeSprite,
			Files:       model.FileCollection{},
			FilesHash:   "",
			Preview:     "fake-preview",
			IsPublic:    model.Personal,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing filesHash", msg)
	})

	t.Run("InvalidIsPublic", func(t *testing.T) {
		params := &AddAssetParams{
			DisplayName: "fake-display-name",
			Owner:       "fake-owner",
			Category:    "fake-category",
			AssetType:   model.AssetTypeSprite,
			Files:       model.FileCollection{},
			FilesHash:   "fake-files-hash",
			Preview:     "fake-preview",
			IsPublic:    -1,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid isPublic", msg)
	})
}

func TestControllerAddAsset(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		params := &AddAssetParams{
			DisplayName: "fake-asset",
			Owner:       "fake-name",
			Category:    "fake-category",
			AssetType:   model.AssetTypeSprite,
			Files:       model.FileCollection{},
			FilesHash:   "fake-files-hash",
			Preview:     "fake-preview",
			IsPublic:    model.Personal,
		}
		mock.ExpectExec(`INSERT INTO asset \(.+\) VALUES \(\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?,\?\)`).
			WillReturnResult(sqlmock.NewResult(1, 1))
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner"}).
				AddRow(1, "fake-asset", "fake-name"))
		asset, err := ctrl.AddAsset(ctx, params)
		require.NoError(t, err)
		require.NotNil(t, asset)
		assert.Equal(t, "1", asset.ID)
	})

	t.Run("NoUser", func(t *testing.T) {
		ctrl, _, err := newTestController(t)
		require.NoError(t, err)

		ctx := context.Background()
		params := &AddAssetParams{
			DisplayName: "fake-asset",
			Owner:       "fake-name",
			Category:    "fake-category",
			AssetType:   model.AssetTypeSprite,
			Files:       model.FileCollection{},
			FilesHash:   "fake-files-hash",
			Preview:     "fake-preview",
			IsPublic:    model.Personal,
		}
		_, err = ctrl.AddAsset(ctx, params)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnauthorized)
	})

	t.Run("UnexpectedUser", func(t *testing.T) {
		ctrl, _, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		params := &AddAssetParams{
			DisplayName: "fake-asset",
			Owner:       "another-fake-name",
			Category:    "fake-category",
			AssetType:   model.AssetTypeSprite,
			Files:       model.FileCollection{},
			FilesHash:   "fake-files-hash",
			Preview:     "fake-preview",
			IsPublic:    model.Personal,
		}
		_, err = ctrl.AddAsset(ctx, params)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrForbidden)
	})

	t.Run("ClosedDB", func(t *testing.T) {
		ctrl, _, err := newTestController(t)
		require.NoError(t, err)
		ctrl.db.Close()

		ctx := newContextWithTestUser(context.Background())
		params := &AddAssetParams{
			DisplayName: "fake-asset",
			Owner:       "fake-name",
			Category:    "fake-category",
			AssetType:   model.AssetTypeSprite,
			Files:       model.FileCollection{},
			FilesHash:   "fake-files-hash",
			Preview:     "fake-preview",
			IsPublic:    model.Personal,
		}
		_, err = ctrl.AddAsset(ctx, params)
		require.Error(t, err)
		assert.EqualError(t, err, "sql: database is closed")
	})
}

func TestUpdateAssetParamsValidate(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		params := &UpdateAssetParams{
			DisplayName: "fake-asset",
			Category:    "fake-category",
			AssetType:   model.AssetTypeSprite,
			Files:       model.FileCollection{},
			FilesHash:   "fake-files-hash",
			Preview:     "fake-preview",
			IsPublic:    model.Personal,
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("EmptyDisplayName", func(t *testing.T) {
		params := &UpdateAssetParams{
			DisplayName: "",
			Category:    "fake-category",
			AssetType:   model.AssetTypeSprite,
			Files:       model.FileCollection{},
			FilesHash:   "fake-files-hash",
			Preview:     "fake-preview",
			IsPublic:    model.Personal,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing displayName", msg)
	})

	t.Run("InvalidDisplayName", func(t *testing.T) {
		params := &UpdateAssetParams{
			DisplayName: strings.Repeat("fake-asset", 11),
			Category:    "fake-category",
			AssetType:   model.AssetTypeSprite,
			Files:       model.FileCollection{},
			FilesHash:   "fake-files-hash",
			Preview:     "fake-preview",
			IsPublic:    model.Personal,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid displayName", msg)
	})

	t.Run("EmptyCategory", func(t *testing.T) {
		params := &UpdateAssetParams{
			DisplayName: "fake-asset",
			Category:    "",
			AssetType:   model.AssetTypeSprite,
			Files:       model.FileCollection{},
			FilesHash:   "fake-files-hash",
			Preview:     "fake-preview",
			IsPublic:    model.Personal,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing category", msg)
	})

	t.Run("InvalidAssetType", func(t *testing.T) {
		params := &UpdateAssetParams{
			DisplayName: "fake-asset",
			Category:    "fake-category",
			AssetType:   -1,
			Files:       model.FileCollection{},
			FilesHash:   "fake-files-hash",
			Preview:     "fake-preview",
			IsPublic:    model.Personal,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid assetType", msg)
	})

	t.Run("EmptyFilesHash", func(t *testing.T) {
		params := &UpdateAssetParams{
			DisplayName: "fake-asset",
			Category:    "fake-category",
			AssetType:   model.AssetTypeSprite,
			Files:       model.FileCollection{},
			FilesHash:   "",
			Preview:     "fake-preview",
			IsPublic:    model.Personal,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing filesHash", msg)
	})

	t.Run("InvalidIsPublic", func(t *testing.T) {
		params := &UpdateAssetParams{
			DisplayName: "fake-asset",
			Category:    "fake-category",
			AssetType:   model.AssetTypeSprite,
			Files:       model.FileCollection{},
			FilesHash:   "fake-files-hash",
			Preview:     "fake-preview",
			IsPublic:    -1,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid isPublic", msg)
	})
}

func TestControllerUpdateAsset(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		params := &UpdateAssetParams{
			DisplayName: "fake-asset",
			Category:    "fake-category",
			AssetType:   model.AssetTypeSprite,
			Files:       model.FileCollection{},
			FilesHash:   "fake-files-hash",
			Preview:     "fake-preview",
			IsPublic:    model.Personal,
		}
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner", "files", "files_hash", "is_public"}).
				AddRow(1, "fake-asset", "fake-name", []byte("{}"), "fake-files-hash", model.Personal))
		mock.ExpectExec(`UPDATE asset SET u_time=\?,display_name=\?,category=\?,asset_type=\?,files=\?,files_hash=\?,preview=\?,is_public=\? WHERE id=\?`).
			WithArgs(sqlmock.AnyArg(), params.DisplayName, params.Category, params.AssetType, []byte("{}"), params.FilesHash, params.Preview, params.IsPublic, "1").
			WillReturnResult(sqlmock.NewResult(1, 1))
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner", "files", "files_hash", "is_public"}).
				AddRow(1, "fake-asset", "fake-name", []byte("{}"), "fake-files-hash", model.Public))
		asset, err := ctrl.UpdateAsset(ctx, "1", params)
		require.NoError(t, err)
		require.NotNil(t, asset)
		assert.Equal(t, "1", asset.ID)
		assert.Equal(t, model.Public, asset.IsPublic)
	})

	t.Run("NoUser", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := context.Background()
		params := &UpdateAssetParams{
			DisplayName: "fake-asset",
			Category:    "fake-category",
			AssetType:   model.AssetTypeSprite,
			Files:       model.FileCollection{},
			FilesHash:   "fake-files-hash",
			Preview:     "fake-preview",
			IsPublic:    model.Personal,
		}
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner", "files", "files_hash", "is_public"}).
				AddRow(1, "fake-asset", "fake-name", []byte("{}"), "fake-files-hash", model.Personal))
		_, err = ctrl.UpdateAsset(ctx, "1", params)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnauthorized)
	})

	t.Run("UnexpectedUser", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		params := &UpdateAssetParams{
			DisplayName: "fake-asset",
			Category:    "fake-category",
			AssetType:   model.AssetTypeSprite,
			Files:       model.FileCollection{},
			FilesHash:   "fake-files-hash",
			Preview:     "fake-preview",
			IsPublic:    model.Personal,
		}
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner", "files", "files_hash", "is_public"}).
				AddRow(1, "fake-asset", "another-fake-name", []byte("{}"), "fake-files-hash", model.Personal))
		_, err = ctrl.UpdateAsset(ctx, "1", params)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrForbidden)
	})

	t.Run("NoAsset", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		params := &UpdateAssetParams{
			DisplayName: "fake-asset",
			Category:    "fake-category",
			AssetType:   model.AssetTypeSprite,
			Files:       model.FileCollection{},
			FilesHash:   "fake-files-hash",
			Preview:     "fake-preview",
			IsPublic:    model.Personal,
		}
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows(nil))
		_, err = ctrl.UpdateAsset(ctx, "1", params)
		require.Error(t, err)
		assert.ErrorIs(t, err, model.ErrNotExist)
	})

	t.Run("ClosedConnForUpdateQuery", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		params := &UpdateAssetParams{
			DisplayName: "fake-asset",
			Category:    "fake-category",
			AssetType:   model.AssetTypeSprite,
			Files:       model.FileCollection{},
			FilesHash:   "fake-files-hash",
			Preview:     "fake-preview",
			IsPublic:    model.Personal,
		}
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner", "files", "files_hash", "is_public"}).
				AddRow(1, "fake-asset", "fake-name", []byte("{}"), "fake-files-hash", model.Personal))
		mock.ExpectExec(`UPDATE asset SET u_time=\?,display_name=\?,category=\?,asset_type=\?,files=\?,files_hash=\?,preview=\?,is_public=\? WHERE id=\?`).
			WithArgs(sqlmock.AnyArg(), params.DisplayName, params.Category, params.AssetType, []byte("{}"), params.FilesHash, params.Preview, params.IsPublic, "1").
			WillReturnError(sql.ErrConnDone)
		_, err = ctrl.UpdateAsset(ctx, "1", params)
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
	})
}

func TestControllerIncreaseAssetClickCount(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner", "files", "files_hash", "is_public"}).
				AddRow(1, "fake-asset", "fake-name", []byte("{}"), "fake-files-hash", model.Personal))
		mock.ExpectExec(`UPDATE asset SET u_time = \?, click_count = click_count \+ 1 WHERE id = \?`).
			WithArgs(sqlmock.AnyArg(), "1").
			WillReturnResult(sqlmock.NewResult(1, 1))
		err = ctrl.IncreaseAssetClickCount(ctx, "1")
		require.NoError(t, err)
	})

	t.Run("NoUser", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := context.Background()
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner", "files", "files_hash", "is_public"}).
				AddRow(1, "fake-asset", "fake-name", []byte("{}"), "fake-files-hash", model.Personal))
		err = ctrl.IncreaseAssetClickCount(ctx, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnauthorized)
	})

	t.Run("UnexpectedUser", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner", "files", "files_hash", "is_public"}).
				AddRow(1, "fake-asset", "another-fake-name", []byte("{}"), "fake-files-hash", model.Personal))
		err = ctrl.IncreaseAssetClickCount(ctx, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrForbidden)
	})

	t.Run("NoAsset", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows(nil))
		err = ctrl.IncreaseAssetClickCount(ctx, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, model.ErrNotExist)
	})

	t.Run("ClosedConnForUpdateQuery", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner", "files", "files_hash", "is_public"}).
				AddRow(1, "fake-asset", "fake-name", []byte("{}"), "fake-files-hash", model.Personal))
		mock.ExpectExec(`UPDATE asset SET u_time = \?, click_count = click_count \+ 1 WHERE id = \?`).
			WithArgs(sqlmock.AnyArg(), "1").
			WillReturnError(sql.ErrConnDone)
		err = ctrl.IncreaseAssetClickCount(ctx, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
	})
}

func TestControllerDeleteAsset(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner", "files", "files_hash", "is_public"}).
				AddRow(1, "fake-asset", "fake-name", []byte("{}"), "fake-files-hash", model.Personal))
		mock.ExpectExec(`UPDATE asset SET u_time=\?,status=\? WHERE id=\?`).
			WithArgs(sqlmock.AnyArg(), model.StatusDeleted, "1").
			WillReturnResult(sqlmock.NewResult(1, 1))
		err = ctrl.DeleteAsset(ctx, "1")
		require.NoError(t, err)
	})

	t.Run("NoUser", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := context.Background()
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner", "files", "files_hash", "is_public"}).
				AddRow(1, "fake-asset", "fake-name", []byte("{}"), "fake-files-hash", model.Personal))
		err = ctrl.DeleteAsset(ctx, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnauthorized)
	})

	t.Run("UnexpectedUser", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner", "files", "files_hash", "is_public"}).
				AddRow(1, "fake-asset", "another-fake-name", []byte("{}"), "fake-files-hash", model.Personal))
		err = ctrl.DeleteAsset(ctx, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrForbidden)
	})

	t.Run("NoAsset", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows(nil))
		err = ctrl.DeleteAsset(ctx, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, model.ErrNotExist)
	})

	t.Run("ClosedConnForUpdateQuery", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		mock.ExpectQuery(`SELECT \* FROM asset WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "display_name", "owner", "files", "files_hash", "is_public"}).
				AddRow(1, "fake-asset", "fake-name", []byte("{}"), "fake-files-hash", model.Personal))
		mock.ExpectExec(`UPDATE asset SET u_time=\?,status=\? WHERE id=\?`).
			WithArgs(sqlmock.AnyArg(), model.StatusDeleted, "1").
			WillReturnError(sql.ErrConnDone)
		err = ctrl.DeleteAsset(ctx, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
	})
}
