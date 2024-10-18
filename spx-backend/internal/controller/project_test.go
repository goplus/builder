package controller

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/builder/spx-backend/internal/model/modeltest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestControllerEnsureProject(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	projectDBColumns, err := modeltest.ExtractDBColumns(db, model.Project{})
	require.NoError(t, err)
	generateProjectDBRows, err := modeltest.NewDBRowsGenerator(db, model.Project{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProject := model.Project{
			Model:      model.Model{ID: 1},
			OwnerID:    mUser.ID,
			Name:       "testproject",
			Visibility: model.VisibilityPublic,
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mUser.Username).
			Where("project.name = ?", mProject.Name).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		project, err := ctrl.ensureProject(ctx, mUser.Username, mProject.Name, false)
		require.NoError(t, err)
		assert.Equal(t, mProject.ID, project.ID)
		assert.Equal(t, mProject.Name, project.Name)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("ProjectNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProjectName := "nonexistent"

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mUser.Username).
			Where("project.name = ?", mProjectName).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		_, err := ctrl.ensureProject(ctx, mUser.Username, mProjectName, false)
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProjectOwnerUsername := "otheruser"

		mProject := model.Project{
			Model:      model.Model{ID: 1},
			OwnerID:    mUser.ID + 1,
			Name:       "privateproject",
			Visibility: model.VisibilityPrivate,
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mProjectOwnerUsername).
			Where("project.name = ?", mProject.Name).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mProject.OwnerID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(model.User{
				Model:    model.Model{ID: mProject.OwnerID},
				Username: mProjectOwnerUsername,
			})...))

		_, err := ctrl.ensureProject(ctx, mProjectOwnerUsername, mProject.Name, false)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrForbidden)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("WithNonOwner", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProjectOwnerUsername := "otheruser"

		mProject := model.Project{
			Model:      model.Model{ID: 1},
			OwnerID:    mUser.ID + 1,
			Name:       "publicproject",
			Visibility: model.VisibilityPublic,
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mProjectOwnerUsername).
			Where("project.name = ?", mProject.Name).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mProject.OwnerID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(model.User{
				Model:    model.Model{ID: mProject.OwnerID},
				Username: mProjectOwnerUsername,
			})...))

		_, err := ctrl.ensureProject(ctx, mProjectOwnerUsername, mProject.Name, true)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrForbidden)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestCreateProjectParams(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		params := &CreateProjectParams{
			RemixSource: "user/project",
			Name:        "testproject",
			Files: model.FileCollection{
				"main.go": "http://example.com/main.go",
			},
			Visibility:   "public",
			Description:  "Test project description",
			Instructions: "How to use this project",
			Thumbnail:    "http://example.com/thumbnail.jpg",
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("ValidWithoutRemixSource", func(t *testing.T) {
		params := &CreateProjectParams{
			Name:         "testproject",
			Files:        model.FileCollection{},
			Visibility:   "private",
			Description:  "Test project description",
			Instructions: "How to use this project",
			Thumbnail:    "http://example.com/thumbnail.jpg",
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("InvalidRemixSource", func(t *testing.T) {
		params := &CreateProjectParams{
			RemixSource: "invalid/project/name",
			Name:        "testproject",
			Visibility:  "public",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid remixSource", msg)
	})

	t.Run("MissingName", func(t *testing.T) {
		params := &CreateProjectParams{
			Visibility: "public",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing name", msg)
	})

	t.Run("InvalidName", func(t *testing.T) {
		params := &CreateProjectParams{
			Name:       "invalid project name",
			Visibility: "public",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid name", msg)
	})

	t.Run("InvalidVisibility", func(t *testing.T) {
		params := &CreateProjectParams{
			Name:       "testproject",
			Visibility: "invalid",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid visibility", msg)
	})
}

func TestControllerCreateProject(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	projectDBColumns, err := modeltest.ExtractDBColumns(db, model.Project{})
	require.NoError(t, err)
	generateProjectDBRows, err := modeltest.NewDBRowsGenerator(db, model.Project{})
	require.NoError(t, err)
	projectReleaseDBColumns, err := modeltest.ExtractDBColumns(db, model.ProjectRelease{})
	require.NoError(t, err)
	generateProjectReleaseDBRows, err := modeltest.NewDBRowsGenerator(db, model.ProjectRelease{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		params := &CreateProjectParams{
			Name:        "testproject",
			Files:       model.FileCollection{"main.go": "http://example.com/main.go"},
			Visibility:  "public",
			Description: "Test project description",
		}

		dbMock.ExpectBegin()
		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Create(&model.Project{}).
			Statement
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnResult(sqlmock.NewResult(1, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.User{}).
			Updates(map[string]any{
				"project_count":        gorm.Expr("project_count + 1"),
				"public_project_count": gorm.Expr("public_project_count + 1"),
			}).
			Statement
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnResult(sqlmock.NewResult(0, 1))
		dbMock.ExpectCommit()

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			First(&model.Project{Model: model.Model{ID: 1}}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(model.Project{
				Model:       model.Model{ID: 1},
				OwnerID:     mUser.ID,
				Name:        params.Name,
				Files:       params.Files,
				Visibility:  model.ParseVisibility(params.Visibility),
				Description: params.Description,
			})...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		projectDTO, err := ctrl.CreateProject(ctx, params)
		require.NoError(t, err)
		assert.Equal(t, params.Name, projectDTO.Name)
		assert.Equal(t, params.Visibility, projectDTO.Visibility)
		assert.Equal(t, params.Description, projectDTO.Description)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("CreateRemix", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mSourceProjectOwnerUsername := "otheruser"

		mSourceProject := model.Project{
			Model:        model.Model{ID: 2},
			OwnerID:      mUser.ID + 1,
			Name:         "sourceproject",
			Visibility:   model.VisibilityPublic,
			Description:  "Source project description",
			Instructions: "Source project instructions",
		}

		mSourceProjectRelease := model.ProjectRelease{
			Model:     model.Model{ID: 1},
			ProjectID: mSourceProject.ID,
			Name:      "v1.0.0",
			Files:     model.FileCollection{"source_main.go": "http://example.com/source_main.go"},
			Thumbnail: "http://example.com/source_thumbnail.jpg",
		}

		params := &CreateProjectParams{
			RemixSource: fmt.Sprintf("%s/%s", mSourceProjectOwnerUsername, mSourceProject.Name),
			Name:        "remixproject",
			Visibility:  "public",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mSourceProjectOwnerUsername).
			Where("project.name = ?", mSourceProject.Name).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mSourceProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mSourceProject.OwnerID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(model.User{
				Model:    model.Model{ID: mSourceProject.OwnerID},
				Username: mSourceProjectOwnerUsername,
			})...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("project_id = ?", mSourceProject.ID).
			Order("created_at DESC").
			First(&model.ProjectRelease{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectReleaseDBColumns).AddRows(generateProjectReleaseDBRows(mSourceProjectRelease)...))

		dbMock.ExpectBegin()
		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Create(&model.Project{}).
			Statement
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnResult(sqlmock.NewResult(3, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.User{}).
			Updates(map[string]any{
				"project_count":        gorm.Expr("project_count + 1"),
				"public_project_count": gorm.Expr("public_project_count + 1"),
			}).
			Statement
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.ProjectRelease{}).
			Where("id = ?", mSourceProjectRelease.ID).
			Update("remix_count", gorm.Expr("remix_count + 1")).
			Statement
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.Project{}).
			Where("id = (?)", ctrl.db.Model(&model.ProjectRelease{}).
				Select("project_id").
				Where("id = ?", mSourceProjectRelease.ID)).
			Update("remix_count", gorm.Expr("remix_count + 1")).
			Statement
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnResult(sqlmock.NewResult(0, 1))
		dbMock.ExpectCommit()

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			First(&model.Project{Model: model.Model{ID: 3}}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(model.Project{
				Model:                model.Model{ID: 3},
				OwnerID:              mUser.ID,
				Name:                 params.Name,
				Files:                mSourceProjectRelease.Files,
				Visibility:           model.ParseVisibility(params.Visibility),
				Description:          mSourceProject.Description,
				Instructions:         mSourceProject.Instructions,
				Thumbnail:            mSourceProjectRelease.Thumbnail,
				RemixedFromReleaseID: sql.NullInt64{Int64: mSourceProjectRelease.ID, Valid: true},
			})...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`project_release`.`id` = ?", mSourceProjectRelease.ID).
			Find(&model.ProjectRelease{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectReleaseDBColumns).AddRows(generateProjectReleaseDBRows(mSourceProjectRelease)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`project`.`id` = ?", mSourceProject.ID).
			Find(&model.Project{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mSourceProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mSourceProject.OwnerID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(model.User{
				Model:    model.Model{ID: mSourceProject.OwnerID},
				Username: mSourceProjectOwnerUsername,
			})...))

		projectDTO, err := ctrl.CreateProject(ctx, params)
		require.NoError(t, err)
		assert.Equal(t, params.Name, projectDTO.Name)
		assert.Equal(t, params.Visibility, projectDTO.Visibility)
		assert.Equal(t, mSourceProject.Description, projectDTO.Description)
		assert.Equal(t, mSourceProject.Instructions, projectDTO.Instructions)
		assert.Equal(t, mSourceProjectRelease.Thumbnail, projectDTO.Thumbnail)
		assert.Equal(t, mSourceProjectRelease.Files, projectDTO.Files)
		assert.Equal(t, fmt.Sprintf("%s/%s/%s", mSourceProjectOwnerUsername, mSourceProject.Name, mSourceProjectRelease.Name), projectDTO.RemixedFrom)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		params := &CreateProjectParams{
			Name:       "testproject",
			Visibility: "public",
		}

		_, err := ctrl.CreateProject(context.Background(), params)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnauthorized)
	})

	t.Run("CreateFailed", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		params := &CreateProjectParams{
			Name:       "testproject",
			Visibility: "public",
		}

		dbMock.ExpectBegin()
		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Create(&model.Project{}).
			Statement
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnError(errors.New("create project failed"))
		dbMock.ExpectRollback()

		_, err := ctrl.CreateProject(ctx, params)
		require.Error(t, err)
		assert.EqualError(t, err, fmt.Sprintf("failed to create project: %s", "create project failed"))

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestListProjectsOrderBy(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		assert.True(t, ListProjectsOrderByCreatedAt.IsValid())
		assert.True(t, ListProjectsOrderByUpdatedAt.IsValid())
		assert.True(t, ListProjectsOrderByLikeCount.IsValid())
		assert.True(t, ListProjectsOrderByRemixCount.IsValid())
		assert.True(t, ListProjectsOrderByRecentLikeCount.IsValid())
		assert.True(t, ListProjectsOrderByRecentRemixCount.IsValid())
	})

	t.Run("Invalid", func(t *testing.T) {
		assert.False(t, ListProjectsOrderBy("invalid").IsValid())
	})
}

func TestListProjectsParams(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		params := NewListProjectsParams()
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("ValidWithAllFields", func(t *testing.T) {
		params := NewListProjectsParams()
		params.Owner = stringPtr("testuser")
		params.RemixedFrom = stringPtr("user/project")
		params.Keyword = stringPtr("test")
		params.Visibility = stringPtr("public")
		params.Liker = stringPtr("liker")
		params.CreatedAfter = &time.Time{}
		params.LikesReceivedAfter = &time.Time{}
		params.RemixesReceivedAfter = &time.Time{}
		params.FromFollowees = boolPtr(true)
		params.OrderBy = ListProjectsOrderByLikeCount
		params.SortOrder = SortOrderAsc
		params.Pagination = Pagination{Index: 2, Size: 10}

		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("InvalidRemixedFrom", func(t *testing.T) {
		params := NewListProjectsParams()
		params.RemixedFrom = stringPtr("invalid/project/name")
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid remixedFrom", msg)
	})

	t.Run("InvalidVisibility", func(t *testing.T) {
		params := NewListProjectsParams()
		params.Visibility = stringPtr("invalid")
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid visibility", msg)
	})

	t.Run("InvalidOrderBy", func(t *testing.T) {
		params := NewListProjectsParams()
		params.OrderBy = ListProjectsOrderBy("invalid")
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid orderBy", msg)
	})

	t.Run("InvalidSortOrder", func(t *testing.T) {
		params := NewListProjectsParams()
		params.SortOrder = SortOrder("invalid")
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid sortOrder", msg)
	})

	t.Run("InvalidPagination", func(t *testing.T) {
		params := NewListProjectsParams()
		params.Pagination.Index = 0
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid pagination", msg)
	})
}

func TestControllerListProjects(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	projectDBColumns, err := modeltest.ExtractDBColumns(db, model.Project{})
	require.NoError(t, err)
	generateProjectDBRows, err := modeltest.NewDBRowsGenerator(db, model.Project{})
	require.NoError(t, err)
	projectReleaseDBColumns, err := modeltest.ExtractDBColumns(db, model.ProjectRelease{})
	require.NoError(t, err)
	generateProjectReleaseDBRows, err := modeltest.NewDBRowsGenerator(db, model.ProjectRelease{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProjects := []model.Project{
			{
				Model:       model.Model{ID: 1},
				OwnerID:     mUser.ID,
				Name:        "project1",
				Visibility:  model.VisibilityPublic,
				Description: "Description 1",
			},
			{
				Model:       model.Model{ID: 2},
				OwnerID:     mUser.ID,
				Name:        "project2",
				Visibility:  model.VisibilityPublic,
				Description: "Description 2",
			},
		}

		params := NewListProjectsParams()
		params.Pagination.Size = 2

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.Project{}).
			Where("project.visibility = ?", model.VisibilityPublic).
			Count(new(int64)).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("project.visibility = ?", model.VisibilityPublic).
			Order("project.created_at desc").
			Limit(2).
			Find(&[]model.Project{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(
				generateProjectDBRows(mProjects...)...,
			))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		result, err := ctrl.ListProjects(ctx, params)
		require.NoError(t, err)
		assert.Equal(t, int64(2), result.Total)
		assert.Len(t, result.Data, 2)
		assert.Equal(t, mProjects[0].Name, result.Data[0].Name)
		assert.Equal(t, mProjects[1].Name, result.Data[1].Name)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("WithOwner", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProjects := []model.Project{
			{
				Model:       model.Model{ID: 1},
				OwnerID:     mUser.ID,
				Name:        "project1",
				Visibility:  model.VisibilityPublic,
				Description: "Description 1",
			},
		}

		params := NewListProjectsParams()
		params.Owner = &mUser.Username

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.Project{}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", *params.Owner).
			Count(new(int64)).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", *params.Owner).
			Order("project.created_at desc").
			Limit(params.Pagination.Size).
			Find(&[]model.Project{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(
				generateProjectDBRows(mProjects...)...,
			))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		result, err := ctrl.ListProjects(ctx, params)
		require.NoError(t, err)
		assert.Equal(t, int64(1), result.Total)
		assert.Len(t, result.Data, 1)
		assert.Equal(t, mProjects[0].Name, result.Data[0].Name)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("WithKeyword", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProjects := []model.Project{
			{
				Model:       model.Model{ID: 1},
				OwnerID:     mUser.ID,
				Name:        "test_project",
				Visibility:  model.VisibilityPublic,
				Description: "Test Description",
			},
		}

		params := NewListProjectsParams()
		keyword := "test"
		params.Keyword = &keyword

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.Project{}).
			Where("project.name LIKE ?", "%"+*params.Keyword+"%").
			Where("project.visibility = ?", model.VisibilityPublic).
			Count(new(int64)).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("project.name LIKE ?", "%"+*params.Keyword+"%").
			Where("project.visibility = ?", model.VisibilityPublic).
			Order("project.created_at desc").
			Limit(params.Pagination.Size).
			Find(&[]model.Project{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(
				generateProjectDBRows(mProjects...)...,
			))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		result, err := ctrl.ListProjects(ctx, params)
		require.NoError(t, err)
		assert.Equal(t, int64(1), result.Total)
		assert.Len(t, result.Data, 1)
		assert.Equal(t, mProjects[0].Name, result.Data[0].Name)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("WithLiker", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		params := NewListProjectsParams()
		liker := "liker_user"
		params.Liker = &liker

		mProjects := []model.Project{
			{
				Model:       model.Model{ID: 1},
				OwnerID:     mUser.ID,
				Name:        "liked_project",
				Visibility:  model.VisibilityPublic,
				Description: "Liked Project",
			},
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.Project{}).
			Joins("JOIN user_project_relationship AS liker_relationship ON liker_relationship.project_id = project.id").
			Joins("JOIN user AS liker ON liker.id = liker_relationship.user_id").
			Where("project.visibility = ?", model.VisibilityPublic).
			Where("liker.username = ?", *params.Liker).
			Where("liker_relationship.liked_at IS NOT NULL").
			Count(new(int64)).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user_project_relationship AS liker_relationship ON liker_relationship.project_id = project.id").
			Joins("JOIN user AS liker ON liker.id = liker_relationship.user_id").
			Where("project.visibility = ?", model.VisibilityPublic).
			Where("liker.username = ?", *params.Liker).
			Where("liker_relationship.liked_at IS NOT NULL").
			Order("project.created_at desc").
			Limit(params.Pagination.Size).
			Find(&[]model.Project{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProjects...)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		result, err := ctrl.ListProjects(ctx, params)
		require.NoError(t, err)
		assert.Equal(t, int64(1), result.Total)
		assert.Len(t, result.Data, 1)
		assert.Equal(t, mProjects[0].Name, result.Data[0].Name)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("WithOrderBy", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProjects := []model.Project{
			{
				Model:       model.Model{ID: 1},
				OwnerID:     mUser.ID,
				Name:        "popular_project",
				Visibility:  model.VisibilityPublic,
				Description: "Popular Project",
				LikeCount:   100,
			},
			{
				Model:       model.Model{ID: 2},
				OwnerID:     mUser.ID,
				Name:        "less_popular_project",
				Visibility:  model.VisibilityPublic,
				Description: "Less Popular Project",
				LikeCount:   50,
			},
		}

		params := NewListProjectsParams()
		params.OrderBy = ListProjectsOrderByLikeCount
		params.SortOrder = SortOrderDesc

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.Project{}).
			Where("project.visibility = ?", model.VisibilityPublic).
			Count(new(int64)).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("project.visibility = ?", model.VisibilityPublic).
			Order("project.like_count desc").
			Limit(params.Pagination.Size).
			Find(&[]model.Project{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(
				generateProjectDBRows(mProjects...)...,
			))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		result, err := ctrl.ListProjects(ctx, params)
		require.NoError(t, err)
		assert.Equal(t, int64(2), result.Total)
		assert.Len(t, result.Data, 2)
		assert.Equal(t, mProjects[0].Name, result.Data[0].Name)
		assert.Equal(t, mProjects[1].Name, result.Data[1].Name)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("ErrorInCount", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		params := NewListProjectsParams()

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.Project{}).
			Where("project.visibility = ?", model.VisibilityPublic).
			Count(new(int64)).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(errors.New("count error"))

		_, err := ctrl.ListProjects(ctx, params)
		require.Error(t, err)
		assert.EqualError(t, err, "failed to count projects: count error")

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("ErrorInQuery", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		params := NewListProjectsParams()

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.Project{}).
			Where("project.visibility = ?", model.VisibilityPublic).
			Count(new(int64)).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("project.visibility = ?", model.VisibilityPublic).
			Order("project.created_at desc").
			Limit(params.Pagination.Size).
			Find(&[]model.Project{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(errors.New("query error"))

		_, err := ctrl.ListProjects(ctx, params)
		require.Error(t, err)
		assert.EqualError(t, err, "failed to list projects: query error")

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("WithRemixedFrom", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProjects := []model.Project{
			{
				Model:                model.Model{ID: 1},
				OwnerID:              mUser.ID,
				Name:                 "remixed_project",
				Visibility:           model.VisibilityPublic,
				Description:          "Remixed Project",
				RemixedFromReleaseID: sql.NullInt64{Int64: 1, Valid: true},
			},
		}

		params := NewListProjectsParams()
		remixedFrom := "original_user/original_project"
		params.RemixedFrom = &remixedFrom

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.Project{}).
			Joins("JOIN project_release ON project_release.id = project.remixed_from_release_id").
			Joins("JOIN project AS remixed_from_project ON remixed_from_project.id = project_release.project_id").
			Joins("JOIN user AS remixed_from_user ON remixed_from_user.id = remixed_from_project.owner_id").
			Where("remixed_from_user.username = ?", "original_user").
			Where("remixed_from_project.name = ?", "original_project").
			Where("project.visibility = ?", model.VisibilityPublic).
			Count(new(int64)).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN project_release ON project_release.id = project.remixed_from_release_id").
			Joins("JOIN project AS remixed_from_project ON remixed_from_project.id = project_release.project_id").
			Joins("JOIN user AS remixed_from_user ON remixed_from_user.id = remixed_from_project.owner_id").
			Where("remixed_from_user.username = ?", "original_user").
			Where("remixed_from_project.name = ?", "original_project").
			Where("project.visibility = ?", model.VisibilityPublic).
			Order("project.created_at desc").
			Limit(params.Pagination.Size).
			Find(&[]model.Project{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(
				generateProjectDBRows(mProjects...)...,
			))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`project_release`.`id` = ?", 1).
			Find(&model.ProjectRelease{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectReleaseDBColumns).AddRows(generateProjectReleaseDBRows(model.ProjectRelease{
				Model: model.Model{ID: 1},
			})...))

		result, err := ctrl.ListProjects(ctx, params)
		require.NoError(t, err)
		assert.Equal(t, int64(1), result.Total)
		assert.Len(t, result.Data, 1)
		assert.Equal(t, mProjects[0].Name, result.Data[0].Name)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestControllerGetProject(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	projectDBColumns, err := modeltest.ExtractDBColumns(db, model.Project{})
	require.NoError(t, err)
	generateProjectDBRows, err := modeltest.NewDBRowsGenerator(db, model.Project{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProject := model.Project{
			Model:       model.Model{ID: 1},
			OwnerID:     mUser.ID,
			Name:        "testproject",
			Visibility:  model.VisibilityPublic,
			Description: "Test project description",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mUser.Username).
			Where("project.name = ?", mProject.Name).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		projectDTO, err := ctrl.GetProject(ctx, mUser.Username, mProject.Name)
		require.NoError(t, err)
		assert.Equal(t, mProject.Name, projectDTO.Name)
		assert.Equal(t, mProject.Visibility.String(), projectDTO.Visibility)
		assert.Equal(t, mProject.Description, projectDTO.Description)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("ProjectNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProjectName := "nonexistent"

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mUser.Username).
			Where("project.name = ?", mProjectName).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		_, err := ctrl.GetProject(ctx, mUser.Username, mProjectName)
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProjectOwnerUsername := "otheruser"

		mProject := model.Project{
			Model:      model.Model{ID: 1},
			OwnerID:    mUser.ID + 1,
			Name:       "privateproject",
			Visibility: model.VisibilityPrivate,
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mProjectOwnerUsername).
			Where("project.name = ?", mProject.Name).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mProject.OwnerID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(model.User{
				Model:    model.Model{ID: mProject.OwnerID},
				Username: mProjectOwnerUsername,
			})...))

		_, err := ctrl.GetProject(ctx, mProjectOwnerUsername, mProject.Name)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrForbidden)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestUpdateProjectParams(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		params := &UpdateProjectParams{
			Files:        model.FileCollection{"main.go": "http://example.com/main.go"},
			Visibility:   "public",
			Description:  "Updated project description",
			Instructions: "Updated instructions",
			Thumbnail:    "http://example.com/updated-thumbnail.jpg",
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("InvalidVisibility", func(t *testing.T) {
		params := &UpdateProjectParams{
			Visibility: "invalid",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid visibility", msg)
	})
}

func TestControllerUpdateProject(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	projectDBColumns, err := modeltest.ExtractDBColumns(db, model.Project{})
	require.NoError(t, err)
	generateProjectDBRows, err := modeltest.NewDBRowsGenerator(db, model.Project{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProject := model.Project{
			Model:       model.Model{ID: 1},
			OwnerID:     mUser.ID,
			Name:        "testproject",
			Visibility:  model.VisibilityPrivate,
			Description: "Original description",
		}

		params := &UpdateProjectParams{
			Visibility:  "public",
			Description: "Updated description",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mUser.Username).
			Where("project.name = ?", mProject.Name).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		dbMock.ExpectBegin()
		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.Project{}).
			Updates(map[string]any{
				"visibility":  model.ParseVisibility(params.Visibility),
				"description": params.Description,
			}).
			Statement
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.User{}).
			Update("public_project_count", gorm.Expr("public_project_count + 1")).
			Statement
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnResult(sqlmock.NewResult(0, 1))
		dbMock.ExpectCommit()

		updatedProject, err := ctrl.UpdateProject(ctx, mUser.Username, mProject.Name, params)
		require.NoError(t, err)
		assert.Equal(t, params.Visibility, updatedProject.Visibility)
		assert.Equal(t, params.Description, updatedProject.Description)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("ProjectNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProjectName := "nonexistent"

		params := &UpdateProjectParams{
			Visibility: "public",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mUser.Username).
			Where("project.name = ?", mProjectName).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		_, err := ctrl.UpdateProject(ctx, mUser.Username, mProjectName, params)
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProjectOwnerUsername := "otheruser"

		mProject := model.Project{
			Model:      model.Model{ID: 1},
			OwnerID:    mUser.ID + 1,
			Name:       "otherproject",
			Visibility: model.VisibilityPublic,
		}

		params := &UpdateProjectParams{
			Visibility: "private",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mProjectOwnerUsername).
			Where("project.name = ?", mProject.Name).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mProject.OwnerID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(model.User{
				Model:    model.Model{ID: mProject.OwnerID},
				Username: mProjectOwnerUsername,
			})...))

		_, err := ctrl.UpdateProject(ctx, mProjectOwnerUsername, mProject.Name, params)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrForbidden)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("NoChanges", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProject := model.Project{
			Model:       model.Model{ID: 1},
			OwnerID:     mUser.ID,
			Name:        "testproject",
			Visibility:  model.VisibilityPublic,
			Description: "Original description",
		}

		params := &UpdateProjectParams{
			Visibility:  "public",
			Description: "Original description",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mUser.Username).
			Where("project.name = ?", mProject.Name).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		updatedProject, err := ctrl.UpdateProject(ctx, mUser.Username, mProject.Name, params)
		require.NoError(t, err)
		assert.Equal(t, mProject.Visibility.String(), updatedProject.Visibility)
		assert.Equal(t, mProject.Description, updatedProject.Description)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestControllerDeleteProject(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	projectDBColumns, err := modeltest.ExtractDBColumns(db, model.Project{})
	require.NoError(t, err)
	generateProjectDBRows, err := modeltest.NewDBRowsGenerator(db, model.Project{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProject := model.Project{
			Model:      model.Model{ID: 1},
			OwnerID:    mUser.ID,
			Name:       "testproject",
			Visibility: model.VisibilityPublic,
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mUser.Username).
			Where("project.name = ?", mProject.Name).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		dbMock.ExpectBegin()
		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Delete(&model.Project{Model: mProject.Model}).
			Statement
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.User{}).
			Updates(map[string]any{
				"project_count":        gorm.Expr("project_count - 1"),
				"public_project_count": gorm.Expr("public_project_count - 1"),
			}).
			Statement
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.User{}).
			Where("id IN (?)", ctrl.db.Model(&model.UserProjectRelationship{}).
				Select("user_id").
				Where("project_id = ?", mProject.ID).
				Where("liked_at IS NOT NULL")).
			Update("liked_project_count", gorm.Expr("liked_project_count - 1")).
			Statement
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Where("project_id = ?", mProject.ID).
			Delete(&model.UserProjectRelationship{}).
			Statement
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.Project{}).
			Where("remixed_from_release_id IN (?)", ctrl.db.Model(&model.ProjectRelease{}).
				Select("id").
				Where("project_id = ?", mProject.ID)).
			Update("remixed_from_release_id", sql.NullInt64{}).
			Statement
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Where("project_id = ?", mProject.ID).
			Delete(&model.ProjectRelease{}).
			Statement
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMock.ExpectCommit()

		err := ctrl.DeleteProject(ctx, mUser.Username, mProject.Name)
		require.NoError(t, err)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("ProjectNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProjectName := "nonexistent"

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mUser.Username).
			Where("project.name = ?", mProjectName).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		err := ctrl.DeleteProject(ctx, mUser.Username, mProjectName)
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProjectOwnerUsername := "otheruser"

		mProject := model.Project{
			Model:      model.Model{ID: 1},
			OwnerID:    mUser.ID + 1,
			Name:       "testproject",
			Visibility: model.VisibilityPublic,
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mProjectOwnerUsername).
			Where("project.name = ?", mProject.Name).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mProject.OwnerID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(model.User{
				Model:    model.Model{ID: mProject.OwnerID},
				Username: mProjectOwnerUsername,
			})...))

		err := ctrl.DeleteProject(ctx, mProjectOwnerUsername, mProject.Name)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrForbidden)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("DeleteFailed", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProject := model.Project{
			Model:      model.Model{ID: 1},
			OwnerID:    mUser.ID,
			Name:       "testproject",
			Visibility: model.VisibilityPublic,
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mUser.Username).
			Where("project.name = ?", mProject.Name).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		dbMock.ExpectBegin()
		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Delete(&model.Project{Model: mProject.Model}).
			Statement
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnError(errors.New("delete failed"))
		dbMock.ExpectRollback()

		err := ctrl.DeleteProject(ctx, mUser.Username, mProject.Name)
		require.Error(t, err)
		assert.EqualError(t, err, fmt.Sprintf("failed to delete project: %s", "delete failed"))

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestControllerLikeProject(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	projectDBColumns, err := modeltest.ExtractDBColumns(db, model.Project{})
	require.NoError(t, err)
	generateProjectDBRows, err := modeltest.NewDBRowsGenerator(db, model.Project{})
	require.NoError(t, err)
	userProjectRelationshipDBColumns, err := modeltest.ExtractDBColumns(db, model.UserProjectRelationship{})
	require.NoError(t, err)
	generateUserProjectRelationshipDBRows, err := modeltest.NewDBRowsGenerator(db, model.UserProjectRelationship{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProjectOwnerUsername := "otheruser"

		mProject := model.Project{
			Model:   model.Model{ID: 1},
			OwnerID: 2,
			Name:    "testproject",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mProjectOwnerUsername).
			Where("project.name = ?", mProject.Name).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("user_id = ?", mUser.ID).
			Where("project_id = ?", mProject.ID).
			First(&model.UserProjectRelationship{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnRows(sqlmock.NewRows(userProjectRelationshipDBColumns))

		dbMock.ExpectBegin()
		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Create(&model.UserProjectRelationship{}).
			Statement
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnResult(sqlmock.NewResult(1, 1))
		dbMock.ExpectCommit()

		dbMock.ExpectBegin()
		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.UserProjectRelationship{Model: model.Model{ID: 1}}).
			Update("liked_at", sqlmock.AnyArg()).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[1] = sqlmock.AnyArg()
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.User{Model: mUser.Model}).
			Update("liked_project_count", gorm.Expr("liked_project_count + 1")).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg()
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.Project{Model: mProject.Model}).
			Update("like_count", gorm.Expr("like_count + 1")).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg()
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))
		dbMock.ExpectCommit()

		err := ctrl.LikeProject(ctx, mProjectOwnerUsername, mProject.Name)
		require.NoError(t, err)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("AlreadyLiked", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProjectOwnerUsername := "otheruser"

		mProject := model.Project{
			Model:   model.Model{ID: 1},
			OwnerID: 2,
			Name:    "testproject",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mProjectOwnerUsername).
			Where("project.name = ?", mProject.Name).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("user_id = ?", mUser.ID).
			Where("project_id = ?", mProject.ID).
			First(&model.UserProjectRelationship{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnRows(sqlmock.NewRows(userProjectRelationshipDBColumns).AddRows(generateUserProjectRelationshipDBRows(model.UserProjectRelationship{
				Model:     model.Model{ID: 1},
				UserID:    mUser.ID,
				ProjectID: mProject.ID,
				LikedAt:   sql.NullTime{Valid: true, Time: time.Now()},
			})...))

		err := ctrl.LikeProject(ctx, mProjectOwnerUsername, mProject.Name)
		require.NoError(t, err)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		err := ctrl.LikeProject(context.Background(), "otheruser", "testproject")
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnauthorized)
	})

	t.Run("ProjectNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		mProjectOwnerUsername := "otheruser"
		mProjectName := "nonexistent"

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mProjectOwnerUsername).
			Where("project.name = ?", mProjectName).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		err := ctrl.LikeProject(ctx, mProjectOwnerUsername, mProjectName)
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestControllerHasLikedProject(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	projectDBColumns, err := modeltest.ExtractDBColumns(db, model.Project{})
	require.NoError(t, err)
	generateProjectDBRows, err := modeltest.NewDBRowsGenerator(db, model.Project{})
	require.NoError(t, err)

	t.Run("HasLiked", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProjectOwnerUsername := "otheruser"

		mProject := model.Project{
			Model:   model.Model{ID: 1},
			OwnerID: 2,
			Name:    "testproject",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mProjectOwnerUsername).
			Where("project.name = ?", mProject.Name).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Select("id").
			Where("user_id = ?", mUser.ID).
			Where("project_id = ?", mProject.ID).
			Where("liked_at IS NOT NULL").
			First(&model.UserProjectRelationship{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))

		hasLiked, err := ctrl.HasLikedProject(ctx, mProjectOwnerUsername, mProject.Name)
		require.NoError(t, err)
		assert.True(t, hasLiked)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("HasNotLiked", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProjectOwnerUsername := "otheruser"

		mProject := model.Project{
			Model:   model.Model{ID: 1},
			OwnerID: 2,
			Name:    "testproject",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mProjectOwnerUsername).
			Where("project.name = ?", mProject.Name).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Select("id").
			Where("user_id = ?", mUser.ID).
			Where("project_id = ?", mProject.ID).
			Where("liked_at IS NOT NULL").
			First(&model.UserProjectRelationship{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		hasLiked, err := ctrl.HasLikedProject(ctx, mProjectOwnerUsername, mProject.Name)
		require.NoError(t, err)
		assert.False(t, hasLiked)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		hasLiked, err := ctrl.HasLikedProject(context.Background(), "otheruser", "testproject")
		require.NoError(t, err)
		assert.False(t, hasLiked)
	})

	t.Run("ProjectNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		mProjectOwnerUsername := "otheruser"
		mProjectName := "nonexistent"

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mProjectOwnerUsername).
			Where("project.name = ?", mProjectName).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		_, err := ctrl.HasLikedProject(ctx, mProjectOwnerUsername, mProjectName)
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestControllerUnlikeProject(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	projectDBColumns, err := modeltest.ExtractDBColumns(db, model.Project{})
	require.NoError(t, err)
	generateProjectDBRows, err := modeltest.NewDBRowsGenerator(db, model.Project{})
	require.NoError(t, err)
	userProjectRelationshipDBColumns, err := modeltest.ExtractDBColumns(db, model.UserProjectRelationship{})
	require.NoError(t, err)
	generateUserProjectRelationshipDBRows, err := modeltest.NewDBRowsGenerator(db, model.UserProjectRelationship{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProjectOwnerUsername := "otheruser"

		mProject := model.Project{
			Model:   model.Model{ID: 1},
			OwnerID: 2,
			Name:    "testproject",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mProjectOwnerUsername).
			Where("project.name = ?", mProject.Name).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("user_id = ?", mUser.ID).
			Where("project_id = ?", mProject.ID).
			First(&model.UserProjectRelationship{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnRows(sqlmock.NewRows(userProjectRelationshipDBColumns).AddRows(generateUserProjectRelationshipDBRows(model.UserProjectRelationship{
				Model:     model.Model{ID: 1},
				UserID:    mUser.ID,
				ProjectID: mProject.ID,
				LikedAt:   sql.NullTime{Valid: true, Time: time.Now()},
			})...))

		dbMock.ExpectBegin()
		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.UserProjectRelationship{Model: model.Model{ID: 1}}).
			Update("liked_at", sql.NullTime{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[1] = sqlmock.AnyArg()
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.User{Model: mUser.Model}).
			Update("liked_project_count", gorm.Expr("liked_project_count - 1")).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg()
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.Project{Model: mProject.Model}).
			Update("like_count", gorm.Expr("like_count - 1")).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg()
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))
		dbMock.ExpectCommit()

		err := ctrl.UnlikeProject(ctx, mProjectOwnerUsername, mProject.Name)
		require.NoError(t, err)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("NotLiked", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mProjectOwnerUsername := "otheruser"

		mProject := model.Project{
			Model:   model.Model{ID: 1},
			OwnerID: 2,
			Name:    "testproject",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mProjectOwnerUsername).
			Where("project.name = ?", mProject.Name).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("user_id = ?", mUser.ID).
			Where("project_id = ?", mProject.ID).
			First(&model.UserProjectRelationship{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnRows(sqlmock.NewRows(userProjectRelationshipDBColumns).AddRows(generateUserProjectRelationshipDBRows(model.UserProjectRelationship{
				Model:     model.Model{ID: 1},
				UserID:    mUser.ID,
				ProjectID: mProject.ID,
				LikedAt:   sql.NullTime{Valid: false},
			})...))

		err := ctrl.UnlikeProject(ctx, mProjectOwnerUsername, mProject.Name)
		require.NoError(t, err)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		err := ctrl.UnlikeProject(context.Background(), "otheruser", "testproject")
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnauthorized)
	})

	t.Run("ProjectNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		mProjectOwnerUsername := "otheruser"
		mProjectName := "nonexistent"

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mProjectOwnerUsername).
			Where("project.name = ?", mProjectName).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		err := ctrl.UnlikeProject(ctx, mProjectOwnerUsername, mProjectName)
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}
