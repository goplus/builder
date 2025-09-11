package controller

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/builder/spx-backend/internal/model/modeltest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func TestParseProjectFullName(t *testing.T) {
	got, err := ParseProjectFullName("user/project")
	require.NoError(t, err)
	assert.Equal(t, "user", got.Owner)
	assert.Equal(t, "project", got.Project)
}

func TestProjectFullNameString(t *testing.T) {
	pfn := ProjectFullName{Owner: "user", Project: "project"}
	got := pfn.String()
	assert.Equal(t, "user/project", got)
}

func TestProjectFullNameMarshalText(t *testing.T) {
	for _, tt := range []struct {
		name string
		pfn  ProjectFullName
		want string
	}{
		{
			name: "normal case",
			pfn:  ProjectFullName{Owner: "user", Project: "project"},
			want: "user/project",
		},
		{
			name: "with special characters",
			pfn:  ProjectFullName{Owner: "user/name", Project: "project-name"},
			want: "user%2Fname/project-name",
		},
		{
			name: "empty owner",
			pfn:  ProjectFullName{Owner: "", Project: "project"},
			want: "",
		},
		{
			name: "empty project",
			pfn:  ProjectFullName{Owner: "owner", Project: ""},
			want: "",
		},
		{
			name: "empty",
			pfn:  ProjectFullName{Owner: "", Project: ""},
			want: "",
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got, err := tt.pfn.MarshalText()
			assert.NoError(t, err)
			assert.Equal(t, tt.want, string(got))
		})
	}
}

func TestProjectFullNameUnmarshalText(t *testing.T) {
	for _, tt := range []struct {
		name    string
		text    string
		want    ProjectFullName
		wantErr bool
	}{
		{
			name:    "normal case",
			text:    "user/project",
			want:    ProjectFullName{Owner: "user", Project: "project"},
			wantErr: false,
		},
		{
			name:    "with escaped characters",
			text:    "user%2Fname/project-name",
			want:    ProjectFullName{Owner: "user/name", Project: "project-name"},
			wantErr: false,
		},
		{
			name:    "invalid format - missing slash",
			text:    "userproject",
			want:    ProjectFullName{},
			wantErr: true,
		},
		{
			name:    "invalid format - too many slashes",
			text:    "user/name/project",
			want:    ProjectFullName{},
			wantErr: true,
		},
		{
			name:    "invalid escaping",
			text:    "user%2/project",
			want:    ProjectFullName{},
			wantErr: true,
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			var got ProjectFullName
			err := got.UnmarshalText([]byte(tt.text))
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestProjectFullNameIsValid(t *testing.T) {
	for _, tt := range []struct {
		name string
		pfn  ProjectFullName
		want bool
	}{
		{
			name: "valid",
			pfn:  ProjectFullName{Owner: "owner", Project: "project"},
			want: true,
		},
		{
			name: "valid with hyphens and underscores",
			pfn:  ProjectFullName{Owner: "owner", Project: "project-name_123"},
			want: true,
		},
		{
			name: "project with invalid characters",
			pfn:  ProjectFullName{Owner: "owner", Project: "project/name"},
			want: false,
		},
		{
			name: "project too long",
			pfn:  ProjectFullName{Owner: "owner", Project: strings.Repeat("a", 101)},
			want: false,
		},
		{
			name: "empty owner",
			pfn:  ProjectFullName{Owner: "", Project: "project"},
			want: false,
		},
		{
			name: "empty project",
			pfn:  ProjectFullName{Owner: "owner", Project: ""},
			want: false,
		},
		{
			name: "empty",
			pfn:  ProjectFullName{Owner: "", Project: ""},
			want: false,
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.pfn.IsValid()
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestParseRemixSource(t *testing.T) {
	got, err := ParseRemixSource("user/project/v1.0.0")
	require.NoError(t, err)
	assert.Equal(t, "user", got.Owner)
	assert.Equal(t, "project", got.Project)
	assert.Equal(t, "v1.0.0", *got.Release)
}

func TestRemixSourceString(t *testing.T) {
	rs := RemixSource{Owner: "user", Project: "project"}
	got := rs.String()
	assert.Equal(t, "user/project", got)
}

func TestRemixSourceMarshalText(t *testing.T) {
	for _, tt := range []struct {
		name string
		rs   RemixSource
		want string
	}{
		{
			name: "without release",
			rs:   RemixSource{Owner: "user", Project: "project"},
			want: "user/project",
		},
		{
			name: "with release",
			rs:   RemixSource{Owner: "user", Project: "project", Release: ptr("v1.0.0")},
			want: "user/project/v1.0.0",
		},
		{
			name: "with special characters without release",
			rs:   RemixSource{Owner: "user/name", Project: "project-name"},
			want: "user%2Fname/project-name",
		},
		{
			name: "with special characters with release",
			rs:   RemixSource{Owner: "user/name", Project: "project-name", Release: ptr("v1.0.0-beta")},
			want: "user%2Fname/project-name/v1.0.0-beta",
		},
		{
			name: "empty owner",
			rs:   RemixSource{Owner: "", Project: "project", Release: ptr("v1.0.0")},
			want: "",
		},
		{
			name: "empty project",
			rs:   RemixSource{Owner: "user", Project: "", Release: ptr("v1.0.0")},
			want: "",
		},
		{
			name: "empty release",
			rs:   RemixSource{Owner: "user", Project: "project", Release: ptr("")},
			want: "",
		},
		{
			name: "empty without release",
			rs:   RemixSource{Owner: "", Project: ""},
			want: "",
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got, err := tt.rs.MarshalText()
			assert.NoError(t, err)
			assert.Equal(t, tt.want, string(got))
		})
	}
}

func TestRemixSourceUnmarshalText(t *testing.T) {
	for _, tt := range []struct {
		name    string
		text    string
		want    RemixSource
		wantErr bool
	}{
		{
			name:    "without release",
			text:    "user/project",
			want:    RemixSource{Owner: "user", Project: "project"},
			wantErr: false,
		},
		{
			name:    "with release",
			text:    "user/project/v1.0.0",
			want:    RemixSource{Owner: "user", Project: "project", Release: ptr("v1.0.0")},
			wantErr: false,
		},
		{
			name:    "with escaped characters without release",
			text:    "user%2Fname/project-name",
			want:    RemixSource{Owner: "user/name", Project: "project-name"},
			wantErr: false,
		},
		{
			name:    "with escaped characters with release",
			text:    "user%2Fname/project-name/v1.0.0-beta",
			want:    RemixSource{Owner: "user/name", Project: "project-name", Release: ptr("v1.0.0-beta")},
			wantErr: false,
		},
		{
			name:    "invalid format - missing parts",
			text:    "user",
			want:    RemixSource{},
			wantErr: true,
		},
		{
			name:    "invalid format - too many parts",
			text:    "user/name/project/v1.0.0/extra",
			want:    RemixSource{},
			wantErr: true,
		},
		{
			name:    "invalid escaping",
			text:    "user%2/project",
			want:    RemixSource{},
			wantErr: true,
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			var got RemixSource
			err := got.UnmarshalText([]byte(tt.text))
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
			assert.Equal(t, tt.want.Owner, got.Owner)
			assert.Equal(t, tt.want.Project, got.Project)
			if tt.want.Release == nil {
				assert.Nil(t, got.Release)
			} else {
				assert.NotNil(t, got.Release)
				assert.Equal(t, *tt.want.Release, *got.Release)
			}
		})
	}
}

func TestRemixSourceIsValid(t *testing.T) {
	for _, tt := range []struct {
		name string
		rs   RemixSource
		want bool
	}{
		{
			name: "valid without release",
			rs:   RemixSource{Owner: "owner", Project: "project"},
			want: true,
		},
		{
			name: "valid with release",
			rs:   RemixSource{Owner: "owner", Project: "project", Release: ptr("v1.0.0")},
			want: true,
		},
		{
			name: "valid with hyphens and underscores without release",
			rs:   RemixSource{Owner: "owner", Project: "project-name_123"},
			want: true,
		},
		{
			name: "valid with prerelease",
			rs:   RemixSource{Owner: "owner", Project: "project", Release: ptr("v1.0.0-alpha")},
			want: true,
		},
		{
			name: "project with invalid characters without release",
			rs:   RemixSource{Owner: "owner", Project: "project/name"},
			want: false,
		},
		{
			name: "project with invalid characters with release",
			rs:   RemixSource{Owner: "owner", Project: "project/name", Release: ptr("v1.0.0")},
			want: false,
		},
		{
			name: "invalid release format",
			rs:   RemixSource{Owner: "owner", Project: "project", Release: ptr("1.0.0")},
			want: false,
		},
		{
			name: "project too long without release",
			rs:   RemixSource{Owner: "owner", Project: strings.Repeat("a", 101)},
			want: false,
		},
		{
			name: "project too long with release",
			rs:   RemixSource{Owner: "owner", Project: strings.Repeat("a", 101), Release: ptr("v1.0.0")},
			want: false,
		},
		{
			name: "empty owner without release",
			rs:   RemixSource{Owner: "", Project: "project"},
			want: false,
		},
		{
			name: "empty owner with release",
			rs:   RemixSource{Owner: "", Project: "project", Release: ptr("v1.0.0")},
			want: false,
		},
		{
			name: "empty project without release",
			rs:   RemixSource{Owner: "owner", Project: ""},
			want: false,
		},
		{
			name: "empty project with release",
			rs:   RemixSource{Owner: "owner", Project: "", Release: ptr("v1.0.0")},
			want: false,
		},
		{
			name: "empty release",
			rs:   RemixSource{Owner: "owner", Project: "project", Release: ptr("")},
			want: false,
		},
		{
			name: "completely empty without release",
			rs:   RemixSource{Owner: "", Project: ""},
			want: false,
		},
		{
			name: "completely empty with release",
			rs:   RemixSource{Owner: "", Project: "", Release: ptr("")},
			want: false,
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.rs.IsValid()
			assert.Equal(t, tt.want, got)
		})
	}
}

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
		mUser, ok := authn.UserFromContext(ctx)
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

		project, err := ctrl.ensureProject(ctx, ProjectFullName{Owner: mUser.Username, Project: mProject.Name}, false)
		require.NoError(t, err)
		assert.Equal(t, mProject.ID, project.ID)
		assert.Equal(t, mProject.Name, project.Name)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("ProjectNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
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

		_, err := ctrl.ensureProject(ctx, ProjectFullName{Owner: mUser.Username, Project: mProjectName}, false)
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
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

		_, err := ctrl.ensureProject(ctx, ProjectFullName{Owner: mProjectOwnerUsername, Project: mProject.Name}, false)
		require.Error(t, err)
		assert.ErrorIs(t, err, authn.ErrForbidden)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("WithNonOwner", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
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

		_, err := ctrl.ensureProject(ctx, ProjectFullName{Owner: mProjectOwnerUsername, Project: mProject.Name}, true)
		require.Error(t, err)
		assert.ErrorIs(t, err, authn.ErrForbidden)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestCreateProjectParams(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		params := &CreateProjectParams{
			RemixSource: &RemixSource{Owner: "user", Project: "project"},
			Name:        "testproject",
			Files: model.FileCollection{
				"main.go": "http://example.com/main.go",
			},
			Visibility:              model.VisibilityPublic,
			Description:             "Test project description",
			Instructions:            "How to use this project",
			Thumbnail:               "http://example.com/thumbnail.jpg",
			MobileKeyboardType:      1, // No keyboard needed
			MobileKeyboardZoneToKey: nil,
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("ValidWithoutRemixSource", func(t *testing.T) {
		params := &CreateProjectParams{
			Name:                    "testproject",
			Files:                   model.FileCollection{},
			Visibility:              model.VisibilityPrivate,
			Description:             "Test project description",
			Instructions:            "How to use this project",
			Thumbnail:               "http://example.com/thumbnail.jpg",
			MobileKeyboardType:      1, // No keyboard needed
			MobileKeyboardZoneToKey: nil,
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("InvalidRemixSource", func(t *testing.T) {
		params := &CreateProjectParams{
			RemixSource: &RemixSource{},
			Name:        "testproject",
			Visibility:  model.VisibilityPublic,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid remixSource", msg)
	})

	t.Run("MissingName", func(t *testing.T) {
		params := &CreateProjectParams{
			Visibility: model.VisibilityPublic,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing name", msg)
	})

	t.Run("InvalidName", func(t *testing.T) {
		params := &CreateProjectParams{
			Name:       "invalid project name",
			Visibility: model.VisibilityPublic,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid name", msg)
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
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		params := &CreateProjectParams{
			Name:                    "testproject",
			Files:                   model.FileCollection{"main.go": "http://example.com/main.go"},
			Visibility:              model.VisibilityPublic,
			Description:             "Test project description",
			MobileKeyboardType:      1, // No keyboard needed
			MobileKeyboardZoneToKey: nil,
		}

		dbMock.ExpectBegin()

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Create(&model.Project{
				OwnerID:                 mUser.ID,
				Name:                    params.Name,
				Version:                 1,
				Files:                   params.Files,
				Visibility:              params.Visibility,
				Description:             params.Description,
				MobileKeyboardType:      params.MobileKeyboardType,
				MobileKeyboardZoneToKey: convertToModelZoneToKeyMapping(params.MobileKeyboardZoneToKey),
			}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg() // CreatedAt
		dbMockArgs[1] = sqlmock.AnyArg() // UpdatedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(1, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.User{Model: mUser.Model}).
			UpdateColumns(map[string]any{
				"project_count":        gorm.Expr("project_count + 1"),
				"public_project_count": gorm.Expr("public_project_count + 1"),
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMock.ExpectCommit()

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			First(&model.Project{Model: model.Model{ID: 1}}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(model.Project{
				Model:                   model.Model{ID: 1},
				OwnerID:                 mUser.ID,
				Name:                    params.Name,
				Files:                   params.Files,
				Visibility:              params.Visibility,
				Description:             params.Description,
				MobileKeyboardType:      1,
				MobileKeyboardZoneToKey: model.MobileKeyboardZoneToKeyMapping{},
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
		assert.Equal(t, params.MobileKeyboardType, projectDTO.MobileKeyboardType)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("CreateRemix", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		mSourceProjectOwnerUsername := "otheruser"

		mSourceProject := model.Project{
			Model:                   model.Model{ID: 2},
			OwnerID:                 mUser.ID + 1,
			Name:                    "sourceproject",
			Visibility:              model.VisibilityPublic,
			Description:             "Source project description",
			Instructions:            "Source project instructions",
			MobileKeyboardType:      1,
			MobileKeyboardZoneToKey: model.MobileKeyboardZoneToKeyMapping{},
		}

		mSourceProjectRelease := model.ProjectRelease{
			Model:     model.Model{ID: 1},
			ProjectID: mSourceProject.ID,
			Name:      "v1.0.0",
			Files:     model.FileCollection{"source_main.go": "http://example.com/source_main.go"},
			Thumbnail: "http://example.com/source_thumbnail.jpg",
		}

		params := &CreateProjectParams{
			RemixSource:             &RemixSource{Owner: mSourceProjectOwnerUsername, Project: mSourceProject.Name},
			Name:                    "remixproject",
			Visibility:              model.VisibilityPublic,
			MobileKeyboardType:      1,
			MobileKeyboardZoneToKey: nil,
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
			Create(&model.Project{
				OwnerID:                 mUser.ID,
				RemixedFromReleaseID:    sql.NullInt64{Int64: mSourceProjectRelease.ID, Valid: true},
				Name:                    params.Name,
				Version:                 1,
				Files:                   mSourceProjectRelease.Files,
				Visibility:              params.Visibility,
				Description:             mSourceProject.Description,
				Instructions:            mSourceProject.Instructions,
				Thumbnail:               mSourceProjectRelease.Thumbnail,
				MobileKeyboardType:      params.MobileKeyboardType,
				MobileKeyboardZoneToKey: convertToModelZoneToKeyMapping(params.MobileKeyboardZoneToKey),
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg() // CreatedAt
		dbMockArgs[1] = sqlmock.AnyArg() // UpdatedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(3, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.User{Model: mUser.Model}).
			UpdateColumns(map[string]any{
				"project_count":        gorm.Expr("project_count + 1"),
				"public_project_count": gorm.Expr("public_project_count + 1"),
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.ProjectRelease{}).
			Where("id = ?", mSourceProjectRelease.ID).
			UpdateColumn("remix_count", gorm.Expr("remix_count + 1")).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.Project{}).
			Where("id = (?)", ctrl.db.Model(&model.ProjectRelease{}).
				Select("project_id").
				Where("id = ?", mSourceProjectRelease.ID)).
			UpdateColumn("remix_count", gorm.Expr("remix_count + 1")).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMock.ExpectCommit()

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			First(&model.Project{Model: model.Model{ID: 3}}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(model.Project{
				Model:                   model.Model{ID: 3},
				OwnerID:                 mUser.ID,
				Name:                    params.Name,
				Files:                   mSourceProjectRelease.Files,
				Visibility:              params.Visibility,
				Description:             mSourceProject.Description,
				Instructions:            mSourceProject.Instructions,
				Thumbnail:               mSourceProjectRelease.Thumbnail,
				RemixedFromReleaseID:    sql.NullInt64{Int64: mSourceProjectRelease.ID, Valid: true},
				MobileKeyboardType:      1,
				MobileKeyboardZoneToKey: model.MobileKeyboardZoneToKeyMapping{},
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
		assert.Equal(t, &RemixSource{Owner: mSourceProjectOwnerUsername, Project: mSourceProject.Name, Release: &mSourceProjectRelease.Name}, projectDTO.RemixedFrom)
		assert.Equal(t, params.MobileKeyboardType, projectDTO.MobileKeyboardType)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		params := &CreateProjectParams{
			Name:                    "testproject",
			Visibility:              model.VisibilityPublic,
			MobileKeyboardType:      1,
			MobileKeyboardZoneToKey: nil,
		}

		_, err := ctrl.CreateProject(context.Background(), params)
		require.Error(t, err)
		assert.ErrorIs(t, err, authn.ErrUnauthorized)
	})

	t.Run("CreateFailed", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		params := &CreateProjectParams{
			Name:                    "testproject",
			Visibility:              model.VisibilityPublic,
			MobileKeyboardType:      1,
			MobileKeyboardZoneToKey: nil,
		}

		dbMock.ExpectBegin()

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Create(&model.Project{
				OwnerID:                 mUser.ID,
				Name:                    params.Name,
				Version:                 1,
				Visibility:              params.Visibility,
				MobileKeyboardType:      params.MobileKeyboardType,
				MobileKeyboardZoneToKey: convertToModelZoneToKeyMapping(params.MobileKeyboardZoneToKey),
			}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg() // CreatedAt
		dbMockArgs[1] = sqlmock.AnyArg() // UpdatedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
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
		assert.True(t, ListProjectsOrderByLikedAt.IsValid())
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
		params.Owner = ptr("testuser")
		params.RemixedFrom = &RemixSource{Owner: "user", Project: "project"}
		params.Keyword = ptr("test")
		params.Visibility = ptr(model.VisibilityPublic)
		params.Liker = ptr("liker")
		params.CreatedAfter = &time.Time{}
		params.LikesReceivedAfter = &time.Time{}
		params.RemixesReceivedAfter = &time.Time{}
		params.FromFollowees = ptr(true)
		params.OrderBy = ListProjectsOrderByLikeCount
		params.SortOrder = SortOrderAsc
		params.Pagination = Pagination{Index: 2, Size: 10}

		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("InvalidRemixedFrom", func(t *testing.T) {
		params := NewListProjectsParams()
		params.RemixedFrom = &RemixSource{}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid remixedFrom", msg)
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
		mUser, ok := authn.UserFromContext(ctx)
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
			Where(ctrl.db.Where("project.owner_id = ?", mUser.ID).Or("project.visibility = ?", model.VisibilityPublic)).
			Count(new(int64)).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where(ctrl.db.Where("project.owner_id = ?", mUser.ID).Or("project.visibility = ?", model.VisibilityPublic)).
			Order("project.created_at asc, project.id").
			Offset(params.Pagination.Offset()).
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
		require.Len(t, result.Data, 2)
		assert.Equal(t, mProjects[0].Name, result.Data[0].Name)
		assert.Equal(t, mProjects[1].Name, result.Data[1].Name)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("WithOwner", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
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
			Order("project.created_at asc, project.id").
			Offset(params.Pagination.Offset()).
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
		require.Len(t, result.Data, 1)
		assert.Equal(t, mProjects[0].Name, result.Data[0].Name)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("WithKeyword", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
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
			Where(ctrl.db.Where("project.owner_id = ?", mUser.ID).Or("project.visibility = ?", model.VisibilityPublic)).
			Count(new(int64)).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("project.name LIKE ?", "%"+*params.Keyword+"%").
			Where(ctrl.db.Where("project.owner_id = ?", mUser.ID).Or("project.visibility = ?", model.VisibilityPublic)).
			Order("project.created_at asc, project.id").
			Offset(params.Pagination.Offset()).
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
		require.Len(t, result.Data, 1)
		assert.Equal(t, mProjects[0].Name, result.Data[0].Name)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("WithLiker", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
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
			Where(ctrl.db.Where("project.owner_id = ?", mUser.ID).Or("project.visibility = ?", model.VisibilityPublic)).
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
			Where(ctrl.db.Where("project.owner_id = ?", mUser.ID).Or("project.visibility = ?", model.VisibilityPublic)).
			Where("liker.username = ?", *params.Liker).
			Where("liker_relationship.liked_at IS NOT NULL").
			Order("project.created_at asc, project.id").
			Offset(params.Pagination.Offset()).
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
		require.Len(t, result.Data, 1)
		assert.Equal(t, mProjects[0].Name, result.Data[0].Name)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("WithOrderBy", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
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
			Where(ctrl.db.Where("project.owner_id = ?", mUser.ID).Or("project.visibility = ?", model.VisibilityPublic)).
			Count(new(int64)).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where(ctrl.db.Where("project.owner_id = ?", mUser.ID).Or("project.visibility = ?", model.VisibilityPublic)).
			Order("project.like_count desc, project.id").
			Offset(params.Pagination.Offset()).
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
		require.Len(t, result.Data, 2)
		assert.Equal(t, mProjects[0].Name, result.Data[0].Name)
		assert.Equal(t, mProjects[1].Name, result.Data[1].Name)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("ErrorInCount", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		params := NewListProjectsParams()
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.Project{}).
			Where(ctrl.db.Where("project.owner_id = ?", mUser.ID).Or("project.visibility = ?", model.VisibilityPublic)).
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
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.Project{}).
			Where(ctrl.db.Where("project.owner_id = ?", mUser.ID).Or("project.visibility = ?", model.VisibilityPublic)).
			Count(new(int64)).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where(ctrl.db.Where("project.owner_id = ?", mUser.ID).Or("project.visibility = ?", model.VisibilityPublic)).
			Order("project.created_at asc, project.id").
			Offset(params.Pagination.Offset()).
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
		mUser, ok := authn.UserFromContext(ctx)
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
		params.RemixedFrom = &RemixSource{Owner: "original_user", Project: "original_project"}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.Project{}).
			Joins("JOIN project_release ON project_release.id = project.remixed_from_release_id").
			Joins("JOIN project AS remixed_from_project ON remixed_from_project.id = project_release.project_id").
			Joins("JOIN user AS remixed_from_user ON remixed_from_user.id = remixed_from_project.owner_id").
			Where("remixed_from_user.username = ?", "original_user").
			Where("remixed_from_project.name = ?", "original_project").
			Where(ctrl.db.Where("project.owner_id = ?", mUser.ID).Or("project.visibility = ?", model.VisibilityPublic)).
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
			Where(ctrl.db.Where("project.owner_id = ?", mUser.ID).Or("project.visibility = ?", model.VisibilityPublic)).
			Order("project.created_at asc, project.id").
			Offset(params.Pagination.Offset()).
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
		require.Len(t, result.Data, 1)
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
		mUser, ok := authn.UserFromContext(ctx)
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

		projectDTO, err := ctrl.GetProject(ctx, ProjectFullName{Owner: mUser.Username, Project: mProject.Name})
		require.NoError(t, err)
		assert.Equal(t, mProject.Name, projectDTO.Name)
		assert.Equal(t, mProject.Visibility, projectDTO.Visibility)
		assert.Equal(t, mProject.Description, projectDTO.Description)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("ProjectNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
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

		_, err := ctrl.GetProject(ctx, ProjectFullName{Owner: mUser.Username, Project: mProjectName})
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
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

		_, err := ctrl.GetProject(ctx, ProjectFullName{Owner: mProjectOwnerUsername, Project: mProject.Name})
		require.Error(t, err)
		assert.ErrorIs(t, err, authn.ErrForbidden)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestUpdateProjectParams(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		params := &UpdateProjectParams{
			Files:                   model.FileCollection{"main.go": "http://example.com/main.go"},
			Visibility:              model.VisibilityPublic,
			Description:             "Updated project description",
			Instructions:            "Updated instructions",
			Thumbnail:               "http://example.com/updated-thumbnail.jpg",
			MobileKeyboardType:      1, // No keyboard needed
			MobileKeyboardZoneToKey: nil,
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
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
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		mProject := model.Project{
			Model:       model.Model{ID: 1},
			OwnerID:     mUser.ID,
			Name:        "testproject",
			Visibility:  model.VisibilityPrivate,
			Description: "Original description",
		}

		params := &UpdateProjectParams{
			Visibility:  model.VisibilityPublic,
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
			Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&model.Project{Model: mProject.Model}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.Project{Model: mProject.Model}).
			Updates(map[string]any{
				"visibility":  params.Visibility,
				"description": params.Description,
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[2] = sqlmock.AnyArg() // UpdatedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.User{Model: mUser.Model}).
			UpdateColumn("public_project_count", gorm.Expr("public_project_count + 1")).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMock.ExpectCommit()

		mUpdatedProject, err := ctrl.UpdateProject(ctx, ProjectFullName{Owner: mUser.Username, Project: mProject.Name}, params)
		require.NoError(t, err)
		assert.Equal(t, params.Visibility, mUpdatedProject.Visibility)
		assert.Equal(t, params.Description, mUpdatedProject.Description)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("ProjectNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		mProjectName := "nonexistent"

		params := &UpdateProjectParams{
			Visibility: model.VisibilityPublic,
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

		_, err := ctrl.UpdateProject(ctx, ProjectFullName{Owner: mUser.Username, Project: mProjectName}, params)
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		mProjectOwnerUsername := "otheruser"

		mProject := model.Project{
			Model:      model.Model{ID: 1},
			OwnerID:    mUser.ID + 1,
			Name:       "otherproject",
			Visibility: model.VisibilityPublic,
		}

		params := &UpdateProjectParams{
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

		_, err := ctrl.UpdateProject(ctx, ProjectFullName{Owner: mProjectOwnerUsername, Project: mProject.Name}, params)
		require.Error(t, err)
		assert.ErrorIs(t, err, authn.ErrForbidden)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("NoChanges", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		mProject := model.Project{
			Model:       model.Model{ID: 1},
			OwnerID:     mUser.ID,
			Name:        "testproject",
			Visibility:  model.VisibilityPublic,
			Description: "Original description",
		}

		params := &UpdateProjectParams{
			Visibility:  model.VisibilityPublic,
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

		mUpdatedProject, err := ctrl.UpdateProject(ctx, ProjectFullName{Owner: mUser.Username, Project: mProject.Name}, params)
		require.NoError(t, err)
		assert.Equal(t, mProject.Visibility, mUpdatedProject.Visibility)
		assert.Equal(t, mProject.Description, mUpdatedProject.Description)

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
		mUser, ok := authn.UserFromContext(ctx)
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
			Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&model.Project{Model: mProject.Model}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Delete(&model.Project{Model: mProject.Model}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg() // DeletedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.User{Model: mUser.Model}).
			UpdateColumns(map[string]any{
				"project_count":        gorm.Expr("project_count - 1"),
				"public_project_count": gorm.Expr("public_project_count - 1"),
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.User{}).
			Where("id IN (?)", ctrl.db.Model(&model.UserProjectRelationship{}).
				Select("user_id").
				Where("project_id = ?", mProject.ID).
				Where("liked_at IS NOT NULL")).
			UpdateColumn("liked_project_count", gorm.Expr("liked_project_count - 1")).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Where("project_id = ?", mProject.ID).
			Delete(&model.UserProjectRelationship{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg() // DeletedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.Project{}).
			Where("remixed_from_release_id IN (?)", ctrl.db.Model(&model.ProjectRelease{}).
				Select("id").
				Where("project_id = ?", mProject.ID)).
			Updates(map[string]any{
				"remixed_from_release_id": sql.NullInt64{},
				"updated_at":              sqlmock.AnyArg(),
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Where("project_id = ?", mProject.ID).
			Delete(&model.ProjectRelease{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg() // DeletedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMock.ExpectCommit()

		err := ctrl.DeleteProject(ctx, ProjectFullName{Owner: mUser.Username, Project: mProject.Name})
		require.NoError(t, err)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("ProjectNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
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

		err := ctrl.DeleteProject(ctx, ProjectFullName{Owner: mUser.Username, Project: mProjectName})
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
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

		err := ctrl.DeleteProject(ctx, ProjectFullName{Owner: mProjectOwnerUsername, Project: mProject.Name})
		require.Error(t, err)
		assert.ErrorIs(t, err, authn.ErrForbidden)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("DeleteFailed", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
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
			Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&model.Project{Model: mProject.Model}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Delete(&model.Project{Model: mProject.Model}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg() // DeletedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(errors.New("delete failed"))

		dbMock.ExpectRollback()

		projectFullName := ProjectFullName{Owner: mUser.Username, Project: mProject.Name}
		err := ctrl.DeleteProject(ctx, projectFullName)
		require.Error(t, err)
		assert.EqualError(t, err, fmt.Sprintf("failed to delete project %q: %s", projectFullName, "delete failed"))

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestControllerRecordProjectView(t *testing.T) {
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
		mUser, ok := authn.UserFromContext(ctx)
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
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userProjectRelationshipDBColumns))

		dbMock.ExpectBegin()

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Create(&model.UserProjectRelationship{
				UserID:    mUser.ID,
				ProjectID: mProject.ID,
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg() // CreatedAt
		dbMockArgs[1] = sqlmock.AnyArg() // UpdatedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(1, 1))

		dbMock.ExpectCommit()

		dbMock.ExpectBegin()

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.UserProjectRelationship{Model: model.Model{ID: 1}}).
			Where("last_viewed_at IS NULL").
			UpdateColumns(map[string]any{
				"view_count":     gorm.Expr("view_count + 1"),
				"last_viewed_at": sqlmock.AnyArg(),
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[1] = sqlmock.AnyArg() // UpdatedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.Project{Model: mProject.Model}).
			UpdateColumn("view_count", gorm.Expr("view_count + 1")).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg() // UpdatedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMock.ExpectCommit()

		err := ctrl.RecordProjectView(ctx, ProjectFullName{Owner: mProjectOwnerUsername, Project: mProject.Name})
		require.NoError(t, err)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("RecentView", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		mProjectOwnerUsername := "otheruser"

		mProject := model.Project{
			Model:   model.Model{ID: 1},
			OwnerID: 2,
			Name:    "testproject",
		}

		recentViewTime := time.Now().Add(-30 * time.Second)

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
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userProjectRelationshipDBColumns).AddRows(generateUserProjectRelationshipDBRows(model.UserProjectRelationship{
				Model:        model.Model{ID: 1},
				UserID:       mUser.ID,
				ProjectID:    mProject.ID,
				LastViewedAt: sql.NullTime{Valid: true, Time: recentViewTime},
			})...))

		err := ctrl.RecordProjectView(ctx, ProjectFullName{Owner: mProjectOwnerUsername, Project: mProject.Name})
		require.NoError(t, err)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		err := ctrl.RecordProjectView(context.Background(), ProjectFullName{Owner: "otheruser", Project: "testproject"})
		require.Error(t, err)
		assert.ErrorIs(t, err, authn.ErrUnauthorized)
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

		err := ctrl.RecordProjectView(ctx, ProjectFullName{Owner: mProjectOwnerUsername, Project: mProjectName})
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

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
		mUser, ok := authn.UserFromContext(ctx)
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
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userProjectRelationshipDBColumns))

		dbMock.ExpectBegin()

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Create(&model.UserProjectRelationship{
				UserID:    mUser.ID,
				ProjectID: mProject.ID,
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg() // CreatedAt
		dbMockArgs[1] = sqlmock.AnyArg() // UpdatedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(1, 1))

		dbMock.ExpectCommit()

		dbMock.ExpectBegin()

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.UserProjectRelationship{Model: model.Model{ID: 1}}).
			Where("liked_at IS NULL").
			Updates(map[string]any{
				"liked_at":   sqlmock.AnyArg(),
				"updated_at": sqlmock.AnyArg(),
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.User{Model: mUser.Model}).
			UpdateColumn("liked_project_count", gorm.Expr("liked_project_count + 1")).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.Project{Model: mProject.Model}).
			UpdateColumn("like_count", gorm.Expr("like_count + 1")).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMock.ExpectCommit()

		err := ctrl.LikeProject(ctx, ProjectFullName{Owner: mProjectOwnerUsername, Project: mProject.Name})
		require.NoError(t, err)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("AlreadyLiked", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
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
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userProjectRelationshipDBColumns).AddRows(generateUserProjectRelationshipDBRows(model.UserProjectRelationship{
				Model:     model.Model{ID: 1},
				UserID:    mUser.ID,
				ProjectID: mProject.ID,
				LikedAt:   sql.NullTime{Valid: true, Time: time.Now()},
			})...))

		err := ctrl.LikeProject(ctx, ProjectFullName{Owner: mProjectOwnerUsername, Project: mProject.Name})
		require.NoError(t, err)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		err := ctrl.LikeProject(context.Background(), ProjectFullName{Owner: "otheruser", Project: "testproject"})
		require.Error(t, err)
		assert.ErrorIs(t, err, authn.ErrUnauthorized)
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

		err := ctrl.LikeProject(ctx, ProjectFullName{Owner: mProjectOwnerUsername, Project: mProjectName})
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
		mUser, ok := authn.UserFromContext(ctx)
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

		hasLiked, err := ctrl.HasLikedProject(ctx, ProjectFullName{Owner: mProjectOwnerUsername, Project: mProject.Name})
		require.NoError(t, err)
		assert.True(t, hasLiked)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("HasNotLiked", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
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

		hasLiked, err := ctrl.HasLikedProject(ctx, ProjectFullName{Owner: mProjectOwnerUsername, Project: mProject.Name})
		require.NoError(t, err)
		assert.False(t, hasLiked)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		hasLiked, err := ctrl.HasLikedProject(context.Background(), ProjectFullName{Owner: "otheruser", Project: "testproject"})
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

		_, err := ctrl.HasLikedProject(ctx, ProjectFullName{Owner: mProjectOwnerUsername, Project: mProjectName})
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
		mUser, ok := authn.UserFromContext(ctx)
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
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userProjectRelationshipDBColumns).AddRows(generateUserProjectRelationshipDBRows(model.UserProjectRelationship{
				Model:     model.Model{ID: 1},
				UserID:    mUser.ID,
				ProjectID: mProject.ID,
				LikedAt:   sql.NullTime{Valid: true, Time: time.Now()},
			})...))

		dbMock.ExpectBegin()

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.UserProjectRelationship{Model: model.Model{ID: 1}}).
			Where("liked_at = ?", sqlmock.AnyArg()).
			Updates(map[string]any{
				"liked_at":   sql.NullTime{},
				"updated_at": sqlmock.AnyArg(),
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.User{Model: mUser.Model}).
			UpdateColumn("liked_project_count", gorm.Expr("liked_project_count - 1")).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.Project{Model: mProject.Model}).
			UpdateColumn("like_count", gorm.Expr("like_count - 1")).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMock.ExpectCommit()

		err := ctrl.UnlikeProject(ctx, ProjectFullName{Owner: mProjectOwnerUsername, Project: mProject.Name})
		require.NoError(t, err)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("NotLiked", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
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
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userProjectRelationshipDBColumns).AddRows(generateUserProjectRelationshipDBRows(model.UserProjectRelationship{
				Model:     model.Model{ID: 1},
				UserID:    mUser.ID,
				ProjectID: mProject.ID,
				LikedAt:   sql.NullTime{Valid: false},
			})...))

		err := ctrl.UnlikeProject(ctx, ProjectFullName{Owner: mProjectOwnerUsername, Project: mProject.Name})
		require.NoError(t, err)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		err := ctrl.UnlikeProject(context.Background(), ProjectFullName{Owner: "otheruser", Project: "testproject"})
		require.Error(t, err)
		assert.ErrorIs(t, err, authn.ErrUnauthorized)
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

		err := ctrl.UnlikeProject(ctx, ProjectFullName{Owner: mProjectOwnerUsername, Project: mProjectName})
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestCreateProjectParamsMobileKeyboard(t *testing.T) {
	t.Run("ValidNoKeyboard", func(t *testing.T) {
		params := &CreateProjectParams{
			Name:                    "testproject",
			MobileKeyboardType:      1,
			MobileKeyboardZoneToKey: nil,
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("ValidCustomKeyboard", func(t *testing.T) {
		params := &CreateProjectParams{
			Name:                    "testproject",
			MobileKeyboardType:      2,
			MobileKeyboardZoneToKey: map[string]*string{"lt": stringPtr("space")},
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("InvalidKeyboardType", func(t *testing.T) {
		params := &CreateProjectParams{
			Name:               "testproject",
			MobileKeyboardType: 3,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Contains(t, msg, "invalid mobileKeyboardType")
	})

	t.Run("CustomKeyboardWithoutMapping", func(t *testing.T) {
		params := &CreateProjectParams{
			Name:                    "testproject",
			MobileKeyboardType:      2,
			MobileKeyboardZoneToKey: nil,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Contains(t, msg, "mobileKeyboardZoneToKey is required")
	})

	t.Run("NoKeyboardWithMapping", func(t *testing.T) {
		params := &CreateProjectParams{
			Name:                    "testproject",
			MobileKeyboardType:      1,
			MobileKeyboardZoneToKey: map[string]*string{"lt": stringPtr("space")},
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Contains(t, msg, "must be empty when mobileKeyboardType is 1")
	})
}

func stringPtr(s string) *string {
	return &s
}
