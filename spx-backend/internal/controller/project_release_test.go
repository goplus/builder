package controller

import (
	"context"
	"database/sql"
	"regexp"
	"strings"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/builder/spx-backend/internal/model/modeltest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func TestParseProjectReleaseFullName(t *testing.T) {
	got, err := ParseProjectReleaseFullName("user/project/v1.0.0")
	require.NoError(t, err)
	assert.Equal(t, "user", got.Owner)
	assert.Equal(t, "project", got.Project)
	assert.Equal(t, "v1.0.0", got.Release)
}

func TestProjectReleaseFullNameString(t *testing.T) {
	prfn := ProjectReleaseFullName{
		ProjectFullName: ProjectFullName{
			Owner:   "user",
			Project: "project",
		},
		Release: "v1.0.0",
	}
	got := prfn.String()
	assert.Equal(t, "user/project/v1.0.0", got)
}

func TestProjectReleaseFullNameMarshalText(t *testing.T) {
	for _, tt := range []struct {
		name string
		prfn ProjectReleaseFullName
		want string
	}{
		{
			name: "normal case",
			prfn: ProjectReleaseFullName{
				ProjectFullName: ProjectFullName{
					Owner:   "user",
					Project: "project",
				},
				Release: "v1.0.0",
			},
			want: "user/project/v1.0.0",
		},
		{
			name: "with special characters",
			prfn: ProjectReleaseFullName{
				ProjectFullName: ProjectFullName{
					Owner:   "user/name",
					Project: "project-name",
				},
				Release: "v1.0.0-beta",
			},
			want: "user%2Fname/project-name/v1.0.0-beta",
		},
		{
			name: "with complex version",
			prfn: ProjectReleaseFullName{
				ProjectFullName: ProjectFullName{
					Owner:   "owner",
					Project: "project",
				},
				Release: "v1.0.0-rc.1+build.123",
			},
			want: "owner/project/v1.0.0-rc.1+build.123",
		},
		{
			name: "empty owner",
			prfn: ProjectReleaseFullName{
				ProjectFullName: ProjectFullName{
					Owner:   "",
					Project: "project",
				},
				Release: "v1.0.0",
			},
			want: "",
		},
		{
			name: "empty project",
			prfn: ProjectReleaseFullName{
				ProjectFullName: ProjectFullName{
					Owner:   "owner",
					Project: "",
				},
				Release: "v1.0.0",
			},
			want: "",
		},
		{
			name: "empty release",
			prfn: ProjectReleaseFullName{
				ProjectFullName: ProjectFullName{
					Owner:   "owner",
					Project: "project",
				},
				Release: "",
			},
			want: "",
		},
		{
			name: "empty",
			prfn: ProjectReleaseFullName{
				ProjectFullName: ProjectFullName{
					Owner:   "",
					Project: "",
				},
				Release: "",
			},
			want: "",
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got, err := tt.prfn.MarshalText()
			assert.NoError(t, err)
			assert.Equal(t, tt.want, string(got))
		})
	}
}

func TestProjectReleaseFullNameUnmarshalText(t *testing.T) {
	for _, tt := range []struct {
		name    string
		text    string
		want    ProjectReleaseFullName
		wantErr bool
	}{
		{
			name: "normal case",
			text: "user/project/v1.0.0",
			want: ProjectReleaseFullName{
				ProjectFullName: ProjectFullName{
					Owner:   "user",
					Project: "project",
				},
				Release: "v1.0.0",
			},
			wantErr: false,
		},
		{
			name: "with escaped characters",
			text: "user%2Fname/project-name/v1.0.0-beta",
			want: ProjectReleaseFullName{
				ProjectFullName: ProjectFullName{
					Owner:   "user/name",
					Project: "project-name",
				},
				Release: "v1.0.0-beta",
			},
			wantErr: false,
		},
		{
			name:    "invalid format - missing parts",
			text:    "user/project",
			want:    ProjectReleaseFullName{},
			wantErr: true,
		},
		{
			name:    "invalid format - too many parts",
			text:    "user/name/project/v1.0.0",
			want:    ProjectReleaseFullName{},
			wantErr: true,
		},
		{
			name:    "invalid escaping",
			text:    "user%2/project/v1.0.0",
			want:    ProjectReleaseFullName{},
			wantErr: true,
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			var got ProjectReleaseFullName
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

func TestProjectReleaseFullNameIsValid(t *testing.T) {
	for _, tt := range []struct {
		name string
		prfn ProjectReleaseFullName
		want bool
	}{
		{
			name: "valid",
			prfn: ProjectReleaseFullName{
				ProjectFullName: ProjectFullName{
					Owner:   "owner",
					Project: "project",
				},
				Release: "v1.0.0",
			},
			want: true,
		},
		{
			name: "valid with prerelease",
			prfn: ProjectReleaseFullName{
				ProjectFullName: ProjectFullName{
					Owner:   "owner",
					Project: "project",
				},
				Release: "v1.0.0-alpha",
			},
			want: true,
		},
		{
			name: "valid with complex version",
			prfn: ProjectReleaseFullName{
				ProjectFullName: ProjectFullName{
					Owner:   "owner",
					Project: "project",
				},
				Release: "v1.0.0-beta.1+build.123",
			},
			want: true,
		},
		{
			name: "invalid release format - missing v prefix",
			prfn: ProjectReleaseFullName{
				ProjectFullName: ProjectFullName{
					Owner:   "owner",
					Project: "project",
				},
				Release: "1.0.0",
			},
			want: false,
		},
		{
			name: "invalid release format - bad semver",
			prfn: ProjectReleaseFullName{
				ProjectFullName: ProjectFullName{
					Owner:   "owner",
					Project: "project",
				},
				Release: "vabc",
			},
			want: false,
		},
		{
			name: "project with invalid characters",
			prfn: ProjectReleaseFullName{
				ProjectFullName: ProjectFullName{
					Owner:   "owner",
					Project: "project/name",
				},
				Release: "v1.0.0",
			},
			want: false,
		},
		{
			name: "project too long",
			prfn: ProjectReleaseFullName{
				ProjectFullName: ProjectFullName{
					Owner:   "owner",
					Project: strings.Repeat("a", 101),
				},
				Release: "v1.0.0",
			},
			want: false,
		},
		{
			name: "empty owner",
			prfn: ProjectReleaseFullName{
				ProjectFullName: ProjectFullName{
					Owner:   "",
					Project: "project",
				},
				Release: "v1.0.0",
			},
			want: false,
		},
		{
			name: "empty project",
			prfn: ProjectReleaseFullName{
				ProjectFullName: ProjectFullName{
					Owner:   "owner",
					Project: "",
				},
				Release: "v1.0.0",
			},
			want: false,
		},
		{
			name: "empty release",
			prfn: ProjectReleaseFullName{
				ProjectFullName: ProjectFullName{
					Owner:   "owner",
					Project: "project",
				},
				Release: "",
			},
			want: false,
		},
		{
			name: "empty",
			prfn: ProjectReleaseFullName{
				ProjectFullName: ProjectFullName{
					Owner:   "",
					Project: "",
				},
				Release: "",
			},
			want: false,
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.prfn.IsValid()
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestCreateProjectReleaseParams(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		params := &CreateProjectReleaseParams{
			ProjectFullName: ProjectFullName{Owner: "user", Project: "project"},
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
			ProjectFullName: ProjectFullName{},
			Name:            "v1.0.0",
			Description:     "First release",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid projectFullName", msg)
	})

	t.Run("InvalidReleaseName", func(t *testing.T) {
		params := &CreateProjectReleaseParams{
			ProjectFullName: ProjectFullName{Owner: "user", Project: "project"},
			Name:            "invalid-version",
			Description:     "First release",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid projectReleaseName", msg)
	})

	t.Run("MissingDescription", func(t *testing.T) {
		params := &CreateProjectReleaseParams{
			ProjectFullName: ProjectFullName{Owner: "user", Project: "project"},
			Name:            "v1.0.0",
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing description", msg)
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
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		mProject := model.Project{
			Model:       model.Model{ID: 1},
			OwnerID:     mUser.ID,
			Name:        "testproject",
			Description: "Test project",
			Thumbnail:   "http://example.com/project-thumbnail.jpg",
		}

		params := &CreateProjectReleaseParams{
			ProjectFullName: ProjectFullName{Owner: mUser.Username, Project: mProject.Name},
			Name:            "v1.0.0",
			Description:     "Test release",
			Thumbnail:       "http://example.com/thumbnail.jpg",
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

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&mProject).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectDBColumns).AddRows(generateProjectDBRows(mProject)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Create(&model.ProjectRelease{
				ProjectID:   mProject.ID,
				Name:        params.Name,
				Description: params.Description,
				Thumbnail:   params.Thumbnail,
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg() // CreatedAt
		dbMockArgs[1] = sqlmock.AnyArg() // UpdatedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(1, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.Project{Model: mProject.Model}).
			Updates(map[string]any{
				"latest_release_id": sql.NullInt64{Int64: 1, Valid: true},
				"release_count":     gorm.Expr("release_count + 1"),
				"updated_at":        sqlmock.AnyArg(),
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
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
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

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
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		mProjectName := "nonexistent"

		params := &CreateProjectReleaseParams{
			ProjectFullName: ProjectFullName{Owner: mUser.Username, Project: mProjectName},
			Name:            "v1.0.0",
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
		params.ProjectFullName = &ProjectFullName{}
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
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

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
			Where("`user`.`id` = ?", mUser.ID).
			Find(&model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*mUser)...))

		projectReleaseFullName := ProjectReleaseFullName{
			ProjectFullName: ProjectFullName{
				Owner:   mUser.Username,
				Project: "testproject",
			},
			Release: "v1.0.0",
		}
		projectReleaseDTO, err := ctrl.GetProjectRelease(ctx, projectReleaseFullName)
		require.NoError(t, err)
		assert.Equal(t, ProjectFullName{Owner: mUser.Username, Project: "testproject"}, projectReleaseDTO.ProjectFullName)
		assert.Equal(t, "v1.0.0", projectReleaseDTO.Name)

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
			WillReturnRows(sqlmock.NewRows(projectDBColumns))

		_, err := ctrl.GetProjectRelease(ctx, ProjectReleaseFullName{
			ProjectFullName: ProjectFullName{
				Owner:   mUser.Username,
				Project: mProjectName,
			},
			Release: "v1.0.0",
		})
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("ReleaseNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		mProject := model.Project{
			Model:      model.Model{ID: 1},
			OwnerID:    1,
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

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("project_id = ?", mProject.ID).
			Where("name = ?", "v1.0.0").
			First(&model.ProjectRelease{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(projectReleaseDBColumns))

		_, err := ctrl.GetProjectRelease(ctx, ProjectReleaseFullName{
			ProjectFullName: ProjectFullName{
				Owner:   mUser.Username,
				Project: mProject.Name,
			},
			Release: "v1.0.0",
		})
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}
