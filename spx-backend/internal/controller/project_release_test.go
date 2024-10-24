package controller

import (
	"context"
	"fmt"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/builder/spx-backend/internal/model/modeltest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestCreateProjectReleaseParams(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		params := &CreateProjectReleaseParams{
			ProjectFullName: "user/project",
			Name:            "v1.0.0",
			Description:     "First release",
			Thumbnail:       "http://example.com/thumbnail.jpg",
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("InvalidProjectFullName", func(t *testing.T) {
		params := &CreateProjectReleaseParams{
			ProjectFullName: "invalid/project/name",
			Name:            "v1.0.0",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid projectFullName", msg)
	})

	t.Run("InvalidReleaseName", func(t *testing.T) {
		params := &CreateProjectReleaseParams{
			ProjectFullName: "user/project",
			Name:            "invalid-version",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid projectReleaseName", msg)
	})
}

func TestControllerCreateProjectRelease(t *testing.T) {
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
		mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		mProject := model.Project{
			Model:       model.Model{ID: 1},
			OwnerID:     mAuthedUser.ID,
			Name:        "testproject",
			Description: "Test project",
			Thumbnail:   "http://example.com/project-thumbnail.jpg",
		}

		params := &CreateProjectReleaseParams{
			ProjectFullName: fmt.Sprintf("%s/%s", mAuthedUser.Username, mProject.Name),
			Name:            "v1.0.0",
			Description:     "Test release",
			Thumbnail:       "http://example.com/thumbnail.jpg",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mAuthedUser.Username).
			Where("project.name = ?", mProject.Name).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

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
			Create(&model.ProjectRelease{}).
			Statement
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnResult(sqlmock.NewResult(1, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.Project{Model: mProject.Model}).
			Update("release_count", gorm.Expr("release_count + 1")).
			Statement
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMock.ExpectCommit()

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			First(&model.ProjectRelease{Model: model.Model{ID: 1}}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectReleaseDBColumns).AddRows(generateProjectReleaseDBRows(model.ProjectRelease{
				Model:       model.Model{ID: 1},
				ProjectID:   mProject.ID,
				Name:        params.Name,
				Description: params.Description,
				Thumbnail:   params.Thumbnail,
				Project:     mProject,
			})...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`project`.`id` = ?", mProject.ID).
			Find(&model.Project{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mAuthedUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mAuthedUser)...))

		releaseDTO, err := ctrl.CreateProjectRelease(ctx, params)
		require.NoError(t, err)
		assert.Equal(t, params.ProjectFullName, releaseDTO.ProjectFullName)
		assert.Equal(t, params.Name, releaseDTO.Name)
		assert.Equal(t, params.Description, releaseDTO.Description)
		assert.Equal(t, params.Thumbnail, releaseDTO.Thumbnail)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("ProjectNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		mProjectName := "nonexistent"

		params := &CreateProjectReleaseParams{
			ProjectFullName: fmt.Sprintf("%s/%s", mAuthedUser.Username, mProjectName),
			Name:            "v1.0.0",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mAuthedUser.Username).
			Where("project.name = ?", mProjectName).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns))

		_, err := ctrl.CreateProjectRelease(ctx, params)
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestListProjectReleasesOrderBy(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		assert.True(t, ListProjectReleasesOrderByCreatedAt.IsValid())
		assert.True(t, ListProjectReleasesOrderByUpdatedAt.IsValid())
		assert.True(t, ListProjectReleasesOrderByRemixCount.IsValid())
	})

	t.Run("Invalid", func(t *testing.T) {
		assert.False(t, ListProjectReleasesOrderBy("invalid").IsValid())
	})
}

func TestListProjectReleasesParams(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		params := NewListProjectReleasesParams()
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("InvalidProjectFullName", func(t *testing.T) {
		params := NewListProjectReleasesParams()
		invalidName := "invalid/project/name"
		params.ProjectFullName = &invalidName
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid projectFullName", msg)
	})

	t.Run("InvalidOrderBy", func(t *testing.T) {
		params := NewListProjectReleasesParams()
		params.OrderBy = ListProjectReleasesOrderBy("invalid")
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid orderBy", msg)
	})

	t.Run("InvalidSortOrder", func(t *testing.T) {
		params := NewListProjectReleasesParams()
		params.SortOrder = SortOrder("invalid")
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid sortOrder", msg)
	})

	t.Run("InvalidPagination", func(t *testing.T) {
		params := NewListProjectReleasesParams()
		params.Pagination.Index = 0
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid pagination", msg)
	})
}

func TestControllerGetProjectRelease(t *testing.T) {
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
		mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		mProject := model.Project{
			Model:      model.Model{ID: 1},
			OwnerID:    1,
			Name:       "testproject",
			Visibility: model.VisibilityPublic,
		}

		mProjectRelease := model.ProjectRelease{
			Model:     model.Model{ID: 1},
			ProjectID: mProject.ID,
			Name:      "v1.0.0",
			Project:   mProject,
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mAuthedUser.Username).
			Where("project.name = ?", mProject.Name).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mAuthedUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mAuthedUser)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("project_id = ?", mProject.ID).
			Where("name = ?", mProjectRelease.Name).
			First(&model.ProjectRelease{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectReleaseDBColumns).AddRows(generateProjectReleaseDBRows(mProjectRelease)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`project`.`id` = ?", mProject.ID).
			Find(&model.Project{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mAuthedUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mAuthedUser)...))

		projectReleaseDTO, err := ctrl.GetProjectRelease(ctx, mAuthedUser.Username, "testproject", "v1.0.0")
		require.NoError(t, err)
		assert.Equal(t, mAuthedUser.Username+"/testproject", projectReleaseDTO.ProjectFullName)
		assert.Equal(t, "v1.0.0", projectReleaseDTO.Name)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("ProjectNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		mProjectName := "nonexistent"

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mAuthedUser.Username).
			Where("project.name = ?", mProjectName).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns))

		_, err := ctrl.GetProjectRelease(ctx, mAuthedUser.Username, mProjectName, "v1.0.0")
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("ReleaseNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		mProject := model.Project{
			Model:      model.Model{ID: 1},
			OwnerID:    1,
			Name:       "testproject",
			Visibility: model.VisibilityPublic,
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", mAuthedUser.Username).
			Where("project.name = ?", mProject.Name).
			First(&model.Project{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("`user`.`id` = ?", mAuthedUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mAuthedUser)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("project_id = ?", mProject.ID).
			Where("name = ?", "v1.0.0").
			First(&model.ProjectRelease{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectReleaseDBColumns))

		_, err := ctrl.GetProjectRelease(ctx, mAuthedUser.Username, mProject.Name, "v1.0.0")
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}
