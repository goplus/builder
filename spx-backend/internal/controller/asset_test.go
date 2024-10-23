package controller

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/builder/spx-backend/internal/model/modeltest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestControllerEnsureAsset(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	assetDBColumns, err := modeltest.ExtractDBColumns(db, model.Asset{})
	require.NoError(t, err)
	generateAssetDBRows, err := modeltest.NewDBRowsGenerator(db, model.Asset{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		mAsset := model.Asset{
			Model:      model.Model{ID: 1},
			OwnerID:    mAuthedUser.ID,
			Visibility: model.VisibilityPublic,
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("id = ?", mAsset.ID).
			First(&model.Asset{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(assetDBColumns).AddRows(generateAssetDBRows(mAsset)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mAuthedUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mAuthedUser)...))

		asset, err := ctrl.ensureAsset(ctx, mAsset.ID, false)
		require.NoError(t, err)
		assert.Equal(t, mAsset.ID, asset.ID)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("AssetNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		var mAssetID int64 = 1

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("id = ?", mAssetID).
			First(&model.Asset{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		_, err := ctrl.ensureAsset(ctx, mAssetID, false)
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		mAsset := model.Asset{
			Model:      model.Model{ID: 1},
			OwnerID:    mAuthedUser.ID + 1,
			Visibility: model.VisibilityPrivate,
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("id = ?", mAsset.ID).
			First(&model.Asset{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(assetDBColumns).AddRows(generateAssetDBRows(mAsset)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mAsset.OwnerID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(model.User{
				Model:    model.Model{ID: mAsset.OwnerID},
				Username: "otheruser",
			})...))

		_, err := ctrl.ensureAsset(ctx, mAsset.ID, false)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrForbidden)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestCreateAssetParams(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		params := &CreateAssetParams{
			DisplayName: "Test Asset",
			Type:        "sprite",
			Category:    "characters",
			FilesHash:   "abc123",
			Visibility:  "public",
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("MissingDisplayName", func(t *testing.T) {
		params := &CreateAssetParams{
			DisplayName: "",
			Type:        "sprite",
			Category:    "characters",
			FilesHash:   "abc123",
			Visibility:  "public",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing displayName", msg)
	})

	t.Run("InvalidDisplayName", func(t *testing.T) {
		params := &CreateAssetParams{
			DisplayName: strings.Repeat("a", 256),
			Type:        "sprite",
			Category:    "characters",
			FilesHash:   "abc123",
			Visibility:  "public",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid displayName", msg)
	})

	t.Run("InvalidType", func(t *testing.T) {
		params := &CreateAssetParams{
			DisplayName: "Test Asset",
			Type:        "invalid",
			Category:    "characters",
			FilesHash:   "abc123",
			Visibility:  "public",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid type", msg)
	})

	t.Run("MissingCategory", func(t *testing.T) {
		params := &CreateAssetParams{
			DisplayName: "Test Asset",
			Type:        "sprite",
			FilesHash:   "abc123",
			Visibility:  "public",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing category", msg)
	})

	t.Run("MissingFilesHash", func(t *testing.T) {
		params := &CreateAssetParams{
			DisplayName: "Test Asset",
			Type:        "sprite",
			Category:    "characters",
			Visibility:  "public",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing filesHash", msg)
	})

	t.Run("InvalidVisibility", func(t *testing.T) {
		params := &CreateAssetParams{
			DisplayName: "Test Asset",
			Type:        "sprite",
			Category:    "characters",
			FilesHash:   "abc123",
			Visibility:  "invalid",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid visibility", msg)
	})
}

func TestControllerCreateAsset(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	assetDBColumns, err := modeltest.ExtractDBColumns(db, model.Asset{})
	require.NoError(t, err)
	generateAssetDBRows, err := modeltest.NewDBRowsGenerator(db, model.Asset{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		params := &CreateAssetParams{
			DisplayName: "Test Asset",
			Type:        "sprite",
			Category:    "characters",
			FilesHash:   "abc123",
			Visibility:  "public",
		}

		dbMock.ExpectBegin()

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Create(&model.Asset{}).
			Statement
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnResult(sqlmock.NewResult(1, 1))

		dbMock.ExpectCommit()

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			First(&model.Asset{Model: model.Model{ID: 1}}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(assetDBColumns).AddRows(generateAssetDBRows(model.Asset{
				Model:       model.Model{ID: 1},
				OwnerID:     mAuthedUser.ID,
				DisplayName: params.DisplayName,
				Type:        model.ParseAssetType(params.Type),
				Category:    params.Category,
				FilesHash:   params.FilesHash,
				Visibility:  model.ParseVisibility(params.Visibility),
			})...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mAuthedUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mAuthedUser)...))

		assetDTO, err := ctrl.CreateAsset(ctx, params)
		require.NoError(t, err)
		assert.Equal(t, params.DisplayName, assetDTO.DisplayName)
		assert.Equal(t, params.Type, assetDTO.Type)
		assert.Equal(t, params.Category, assetDTO.Category)
		assert.Equal(t, params.FilesHash, assetDTO.FilesHash)
		assert.Equal(t, params.Visibility, assetDTO.Visibility)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		params := &CreateAssetParams{
			DisplayName: "Test Asset",
			Type:        "sprite",
			Category:    "characters",
			FilesHash:   "abc123",
			Visibility:  "public",
		}

		_, err := ctrl.CreateAsset(context.Background(), params)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnauthorized)
	})
}

func TestListAssetsOrderBy(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		assert.True(t, ListAssetsOrderByCreatedAt.IsValid())
		assert.True(t, ListAssetsOrderByUpdatedAt.IsValid())
	})

	t.Run("Invalid", func(t *testing.T) {
		assert.False(t, ListAssetsOrderBy("invalid").IsValid())
	})
}

func TestListAssetsParams(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		params := NewListAssetsParams()
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("InvalidType", func(t *testing.T) {
		params := NewListAssetsParams()
		invalidType := "invalid"
		params.Type = &invalidType
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid type", msg)
	})

	t.Run("InvalidVisibility", func(t *testing.T) {
		params := NewListAssetsParams()
		invalidVisibility := "invalid"
		params.Visibility = &invalidVisibility
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid visibility", msg)
	})

	t.Run("InvalidOrderBy", func(t *testing.T) {
		params := NewListAssetsParams()
		params.OrderBy = "invalid"
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid orderBy", msg)
	})

	t.Run("InvalidSortOrder", func(t *testing.T) {
		params := NewListAssetsParams()
		params.SortOrder = "invalid"
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid sortOrder", msg)
	})

	t.Run("InvalidPagination", func(t *testing.T) {
		params := NewListAssetsParams()
		params.Pagination.Index = 0
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid pagination", msg)
	})
}

func TestControllerListAssets(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	assetDBColumns, err := modeltest.ExtractDBColumns(db, model.Asset{})
	require.NoError(t, err)
	generateAssetDBRows, err := modeltest.NewDBRowsGenerator(db, model.Asset{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		params := NewListAssetsParams()

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.Asset{}).
			Where(ctrl.db.Where("asset.owner_id = ?", mAuthedUser.ID).Or("asset.visibility = ?", model.VisibilityPublic)).
			Count(new(int64)).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where(ctrl.db.Where("asset.owner_id = ?", mAuthedUser.ID).Or("asset.visibility = ?", model.VisibilityPublic)).
			Order("asset.created_at desc, asset.id").
			Limit(params.Pagination.Size).
			Find(&[]model.Asset{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(assetDBColumns).AddRows(
				generateAssetDBRows(
					model.Asset{Model: model.Model{ID: 1}, OwnerID: mAuthedUser.ID, Visibility: model.VisibilityPublic},
					model.Asset{Model: model.Model{ID: 2}, OwnerID: mAuthedUser.ID, Visibility: model.VisibilityPublic},
				)...,
			))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mAuthedUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mAuthedUser)...))

		result, err := ctrl.ListAssets(ctx, params)
		require.NoError(t, err)
		assert.Equal(t, int64(2), result.Total)
		assert.Len(t, result.Data, 2)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestControllerGetAsset(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	assetDBColumns, err := modeltest.ExtractDBColumns(db, model.Asset{})
	require.NoError(t, err)
	generateAssetDBRows, err := modeltest.NewDBRowsGenerator(db, model.Asset{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		mAsset := model.Asset{
			Model:      model.Model{ID: 1},
			OwnerID:    mAuthedUser.ID,
			Visibility: model.VisibilityPublic,
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("id = ?", mAsset.ID).
			First(&model.Asset{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(assetDBColumns).AddRows(generateAssetDBRows(mAsset)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mAuthedUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mAuthedUser)...))

		asset, err := ctrl.GetAsset(ctx, "1")
		require.NoError(t, err)
		assert.Equal(t, strconv.FormatInt(mAsset.ID, 10), asset.ID)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("AssetNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		var mAssetID int64 = 1

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("id = ?", mAssetID).
			First(&model.Asset{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		_, err := ctrl.GetAsset(ctx, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestUpdateAssetParams(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		params := &UpdateAssetParams{
			DisplayName: "Updated Asset",
			Type:        "sprite",
			Category:    "characters",
			FilesHash:   "def456",
			Visibility:  "public",
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("MissingDisplayName", func(t *testing.T) {
		params := &UpdateAssetParams{
			DisplayName: "",
			Type:        "sprite",
			Category:    "characters",
			FilesHash:   "def456",
			Visibility:  "public",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing displayName", msg)
	})

	t.Run("InvalidDisplayName", func(t *testing.T) {
		params := &UpdateAssetParams{
			DisplayName: strings.Repeat("a", 256),
			Type:        "sprite",
			Category:    "characters",
			FilesHash:   "def456",
			Visibility:  "public",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid displayName", msg)
	})

	t.Run("InvalidType", func(t *testing.T) {
		params := &UpdateAssetParams{
			DisplayName: "Updated Asset",
			Type:        "invalid",
			Category:    "characters",
			FilesHash:   "def456",
			Visibility:  "public",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid type", msg)
	})

	t.Run("MissingCategory", func(t *testing.T) {
		params := &UpdateAssetParams{
			DisplayName: "Updated Asset",
			Type:        "sprite",
			FilesHash:   "def456",
			Visibility:  "public",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing category", msg)
	})

	t.Run("MissingFilesHash", func(t *testing.T) {
		params := &UpdateAssetParams{
			DisplayName: "Updated Asset",
			Type:        "sprite",
			Category:    "characters",
			Visibility:  "public",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing filesHash", msg)
	})

	t.Run("InvalidVisibility", func(t *testing.T) {
		params := &UpdateAssetParams{
			DisplayName: "Updated Asset",
			Type:        "sprite",
			Category:    "characters",
			FilesHash:   "def456",
			Visibility:  "invalid",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid visibility", msg)
	})
}

func TestControllerUpdateAsset(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	assetDBColumns, err := modeltest.ExtractDBColumns(db, model.Asset{})
	require.NoError(t, err)
	generateAssetDBRows, err := modeltest.NewDBRowsGenerator(db, model.Asset{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		mAsset := model.Asset{
			Model:       model.Model{ID: 1},
			OwnerID:     mAuthedUser.ID,
			DisplayName: "Old Name",
			Type:        model.AssetTypeSprite,
			Category:    "old-category",
			FilesHash:   "old-hash",
			Visibility:  model.VisibilityPublic,
		}

		params := &UpdateAssetParams{
			DisplayName: "Updated Asset",
			Type:        "backdrop",
			Category:    "new-category",
			FilesHash:   "new-hash",
			Visibility:  "private",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("id = ?", mAsset.ID).
			First(&model.Asset{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(assetDBColumns).AddRows(generateAssetDBRows(mAsset)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mAuthedUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mAuthedUser)...))

		dbMock.ExpectBegin()

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.Asset{Model: mAsset.Model}).
			Updates(map[string]any{
				"display_name": params.DisplayName,
				"type":         model.ParseAssetType(params.Type),
				"category":     params.Category,
				"files_hash":   params.FilesHash,
				"visibility":   model.ParseVisibility(params.Visibility),
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[5] = sqlmock.AnyArg() // UpdatedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMock.ExpectCommit()

		mUpdatedAsset, err := ctrl.UpdateAsset(ctx, "1", params)
		require.NoError(t, err)
		assert.Equal(t, params.DisplayName, mUpdatedAsset.DisplayName)
		assert.Equal(t, params.Type, mUpdatedAsset.Type)
		assert.Equal(t, params.Category, mUpdatedAsset.Category)
		assert.Equal(t, params.FilesHash, mUpdatedAsset.FilesHash)
		assert.Equal(t, params.Visibility, mUpdatedAsset.Visibility)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("AssetNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		var mAssetID int64 = 1

		params := &UpdateAssetParams{
			DisplayName: "Updated Asset",
			Type:        "backdrop",
			Category:    "new-category",
			FilesHash:   "new-hash",
			Visibility:  "private",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("id = ?", mAssetID).
			First(&model.Asset{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		_, err := ctrl.UpdateAsset(ctx, "1", params)
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		mAsset := model.Asset{
			Model:       model.Model{ID: 1},
			OwnerID:     mAuthedUser.ID + 1,
			DisplayName: "Old Name",
			Type:        model.AssetTypeSprite,
			Category:    "old-category",
			FilesHash:   "old-hash",
			Visibility:  model.VisibilityPublic,
		}

		params := &UpdateAssetParams{
			DisplayName: "Updated Asset",
			Type:        "backdrop",
			Category:    "new-category",
			FilesHash:   "new-hash",
			Visibility:  "private",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("id = ?", mAsset.ID).
			First(&model.Asset{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(assetDBColumns).AddRows(generateAssetDBRows(mAsset)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mAsset.OwnerID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(model.User{
				Model:    model.Model{ID: mAsset.OwnerID},
				Username: "otheruser",
			})...))

		_, err := ctrl.UpdateAsset(ctx, "1", params)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrForbidden)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestControllerDeleteAsset(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	assetDBColumns, err := modeltest.ExtractDBColumns(db, model.Asset{})
	require.NoError(t, err)
	generateAssetDBRows, err := modeltest.NewDBRowsGenerator(db, model.Asset{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		mAsset := model.Asset{
			Model:      model.Model{ID: 1},
			OwnerID:    mAuthedUser.ID,
			Visibility: model.VisibilityPublic,
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("id = ?", mAsset.ID).
			First(&model.Asset{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(assetDBColumns).AddRows(generateAssetDBRows(mAsset)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mAuthedUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mAuthedUser)...))

		dbMock.ExpectBegin()

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Delete(&model.Asset{Model: mAsset.Model}).
			Statement
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMock.ExpectCommit()

		err := ctrl.DeleteAsset(ctx, "1")
		require.NoError(t, err)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("AssetNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		var mAssetID int64 = 1

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("id = ?", mAssetID).
			First(&model.Asset{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		err := ctrl.DeleteAsset(ctx, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		mAsset := model.Asset{
			Model:      model.Model{ID: 1},
			OwnerID:    mAuthedUser.ID + 1,
			Visibility: model.VisibilityPrivate,
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("id = ?", mAsset.ID).
			First(&model.Asset{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(assetDBColumns).AddRows(generateAssetDBRows(mAsset)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mAsset.OwnerID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(model.User{
				Model:    model.Model{ID: mAsset.OwnerID},
				Username: "otheruser",
			})...))

		err := ctrl.DeleteAsset(ctx, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrForbidden)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("InvalidID", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		err := ctrl.DeleteAsset(ctx, "invalid")
		require.Error(t, err)
		assert.EqualError(t, err, fmt.Sprintf("invalid asset id: %s", `strconv.ParseInt: parsing "invalid": invalid syntax`))
	})
}
