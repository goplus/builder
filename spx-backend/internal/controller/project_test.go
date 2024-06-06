package controller

import (
	"context"
	"database/sql"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestControllerEnsureProject(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "owner"}).
				AddRow(1, "fake-project", "fake-name"))
		project, err := ctrl.ensureProject(ctx, "fake-name", "fake-project", false)
		require.NoError(t, err)
		require.NotNil(t, project)
		assert.Equal(t, "1", project.ID)
	})

	t.Run("NoProject", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows(nil))
		_, err = ctrl.ensureProject(ctx, "fake-name", "fake-project", false)
		require.Error(t, err)
		assert.ErrorIs(t, err, model.ErrNotExist)
	})

	t.Run("NoUser", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := context.Background()
		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "owner"}).
				AddRow(1, "fake-project", "fake-name"))
		_, err = ctrl.ensureProject(ctx, "fake-name", "fake-project", false)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnauthorized)
	})

	t.Run("NoUserWithPublicProject", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := context.Background()
		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "owner", "is_public"}).
				AddRow(1, "fake-project", "fake-name", model.Public))
		project, err := ctrl.ensureProject(ctx, "fake-name", "fake-project", false)
		require.NoError(t, err)
		require.NotNil(t, project)
		assert.Equal(t, "1", project.ID)
	})

	t.Run("NoUserWithPublicProjectButCheckOwner", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := context.Background()
		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "owner", "is_public"}).
				AddRow(1, "fake-project", "fake-name", model.Public))
		_, err = ctrl.ensureProject(ctx, "fake-name", "fake-project", true)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnauthorized)
	})

	t.Run("NoUserWithPersonalProject", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := context.Background()
		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "owner", "is_public"}).
				AddRow(1, "fake-project", "fake-name", model.Personal))
		_, err = ctrl.ensureProject(ctx, "fake-name", "fake-project", false)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnauthorized)
	})
}

func TestControllerGetProject(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "owner"}).
				AddRow(1, "fake-project", "fake-name"))
		project, err := ctrl.GetProject(ctx, "fake-name", "fake-project")
		require.NoError(t, err)
		require.NotNil(t, project)
		assert.Equal(t, "1", project.ID)
	})

	t.Run("NoProject", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows(nil))
		_, err = ctrl.GetProject(ctx, "fake-name", "fake-project")
		require.Error(t, err)
		assert.ErrorIs(t, err, model.ErrNotExist)
	})
}

func TestListProjectsParamsValidate(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		paramsOwner := "fake-name"
		paramsIsPublic := model.Personal
		params := &ListProjectsParams{
			Owner:      &paramsOwner,
			IsPublic:   &paramsIsPublic,
			Pagination: model.Pagination{Index: 1, Size: 10},
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})
}

func TestControllerListProjects(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		paramsOwner := "fake-name"
		paramsIsPublic := model.Personal
		params := &ListProjectsParams{
			Owner:      &paramsOwner,
			IsPublic:   &paramsIsPublic,
			Pagination: model.Pagination{Index: 1, Size: 10},
		}
		mock.ExpectQuery(`SELECT COUNT\(\*\) FROM project WHERE owner = \? AND is_public = \? AND status != \?`).
			WithArgs(params.Owner, model.Personal, model.StatusDeleted).
			WillReturnRows(mock.NewRows([]string{"COUNT(*)"}).
				AddRow(1))
		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND is_public = \? AND status != \? ORDER BY id ASC LIMIT \?, \?`).
			WithArgs(params.Owner, model.Personal, model.StatusDeleted, 0, 10).
			WillReturnRows(mock.NewRows([]string{"id", "name", "owner"}).
				AddRow(1, "fake-project", "fake-name"))
		projects, err := ctrl.ListProjects(ctx, params)
		require.NoError(t, err)
		require.NotNil(t, projects)
		assert.Len(t, projects.Data, 1)
		assert.Equal(t, "1", projects.Data[0].ID)
	})

	t.Run("NoUser", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := context.Background()
		paramsOwner := "fake-name"
		paramsIsPublic := model.Personal
		params := &ListProjectsParams{
			Owner:      &paramsOwner,
			IsPublic:   &paramsIsPublic,
			Pagination: model.Pagination{Index: 1, Size: 10},
		}
		mock.ExpectQuery(`SELECT COUNT\(\*\) FROM project WHERE owner = \? AND is_public = \? AND status != \?`).
			WithArgs(params.Owner, model.Public, model.StatusDeleted).
			WillReturnRows(mock.NewRows([]string{"COUNT(*)"}).
				AddRow(1))
		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND is_public = \? AND status != \? ORDER BY id ASC LIMIT \?, \?`).
			WithArgs(params.Owner, model.Public, model.StatusDeleted, 0, 10).
			WillReturnRows(mock.NewRows([]string{"id", "name", "owner"}).
				AddRow(1, "fake-project", "fake-name"))
		projects, err := ctrl.ListProjects(ctx, params)
		require.NoError(t, err)
		require.NotNil(t, projects)
		assert.Len(t, projects.Data, 1)
		assert.Equal(t, "1", projects.Data[0].ID)
	})

	t.Run("NoOwner", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		paramsIsPublic := model.Personal
		params := &ListProjectsParams{
			IsPublic:   &paramsIsPublic,
			Pagination: model.Pagination{Index: 1, Size: 10},
		}
		mock.ExpectQuery(`SELECT COUNT\(\*\) FROM project WHERE is_public = \? AND status != \?`).
			WithArgs(model.Public, model.StatusDeleted).
			WillReturnRows(mock.NewRows([]string{"COUNT(*)"}).
				AddRow(1))
		mock.ExpectQuery(`SELECT \* FROM project WHERE is_public = \? AND status != \? ORDER BY id ASC LIMIT \?, \?`).
			WithArgs(model.Public, model.StatusDeleted, 0, 10).
			WillReturnRows(mock.NewRows([]string{"id", "name", "owner"}).
				AddRow(1, "fake-project", "fake-name"))
		projects, err := ctrl.ListProjects(ctx, params)
		require.NoError(t, err)
		require.NotNil(t, projects)
		assert.Len(t, projects.Data, 1)
		assert.Equal(t, "1", projects.Data[0].ID)
	})

	t.Run("DifferentOwner", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		paramsOwner := "another-fake-name"
		paramsIsPublic := model.Personal
		params := &ListProjectsParams{
			Owner:      &paramsOwner,
			IsPublic:   &paramsIsPublic,
			Pagination: model.Pagination{Index: 1, Size: 10},
		}
		mock.ExpectQuery(`SELECT COUNT\(\*\) FROM project WHERE owner = \? AND is_public = \? AND status != \?`).
			WithArgs(params.Owner, model.Public, model.StatusDeleted).
			WillReturnRows(mock.NewRows([]string{"COUNT(*)"}).
				AddRow(1))
		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND is_public = \? AND status != \? ORDER BY id ASC LIMIT \?, \?`).
			WithArgs(params.Owner, model.Public, model.StatusDeleted, 0, 10).
			WillReturnRows(mock.NewRows([]string{"id", "name", "owner"}).
				AddRow(1, "fake-project", "another-fake-name"))
		projects, err := ctrl.ListProjects(ctx, params)
		require.NoError(t, err)
		require.NotNil(t, projects)
		assert.Len(t, projects.Data, 1)
		assert.Equal(t, "1", projects.Data[0].ID)
	})

	t.Run("ClosedDB", func(t *testing.T) {
		ctrl, _, err := newTestController(t)
		require.NoError(t, err)
		ctrl.db.Close()

		ctx := newContextWithTestUser(context.Background())
		paramsOwner := "fake-name"
		paramsIsPublic := model.Personal
		params := &ListProjectsParams{
			Owner:      &paramsOwner,
			IsPublic:   &paramsIsPublic,
			Pagination: model.Pagination{Index: 1, Size: 10},
		}
		_, err = ctrl.ListProjects(ctx, params)
		require.Error(t, err)
		assert.EqualError(t, err, "sql: database is closed")
	})
}

func TestAddProjectParamsValidate(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		params := &AddProjectParams{
			Name:     "fake-name",
			Owner:    "fake-owner",
			Files:    model.FileCollection{},
			IsPublic: model.Personal,
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("EmptyName", func(t *testing.T) {
		params := &AddProjectParams{
			Name:     "",
			Owner:    "fake-owner",
			Files:    model.FileCollection{},
			IsPublic: model.Personal,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing name", msg)
	})

	t.Run("InvalidName", func(t *testing.T) {
		params := &AddProjectParams{
			Name:     "fake-name@",
			Owner:    "fake-owner",
			Files:    model.FileCollection{},
			IsPublic: model.Personal,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid name", msg)
	})

	t.Run("EmptyOwner", func(t *testing.T) {
		params := &AddProjectParams{
			Name:     "fake-name",
			Owner:    "",
			Files:    model.FileCollection{},
			IsPublic: model.Personal,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "missing owner", msg)
	})

	t.Run("InvalidIsPublic", func(t *testing.T) {
		params := &AddProjectParams{
			Name:     "fake-name",
			Owner:    "fake-owner",
			Files:    model.FileCollection{},
			IsPublic: -1,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid isPublic", msg)
	})
}

func TestControllerAddProject(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		params := &AddProjectParams{
			Name:     "fake-project",
			Owner:    "fake-name",
			Files:    model.FileCollection{},
			IsPublic: model.Personal,
		}
		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows(nil))
		mock.ExpectExec(`INSERT INTO project \(.+\) VALUES \(\?,\?,\?,\?,\?,\?,\?,\?\)`).
			WillReturnResult(sqlmock.NewResult(1, 1))
		mock.ExpectQuery(`SELECT \* FROM project WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "owner"}).
				AddRow(1, "fake-project", "fake-name"))
		project, err := ctrl.AddProject(ctx, params)
		require.NoError(t, err)
		require.NotNil(t, project)
		assert.Equal(t, "1", project.ID)
	})

	t.Run("Exist", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		params := &AddProjectParams{
			Name:     "fake-project",
			Owner:    "fake-name",
			Files:    model.FileCollection{},
			IsPublic: model.Personal,
		}
		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "owner"}).
				AddRow(1, "fake-project", "fake-name"))
		_, err = ctrl.AddProject(ctx, params)
		require.Error(t, err)
		assert.ErrorIs(t, err, model.ErrExist)
	})

	t.Run("NoUser", func(t *testing.T) {
		ctrl, _, err := newTestController(t)
		require.NoError(t, err)

		ctx := context.Background()
		params := &AddProjectParams{
			Name:     "fake-project",
			Owner:    "fake-name",
			Files:    model.FileCollection{},
			IsPublic: model.Personal,
		}
		_, err = ctrl.AddProject(ctx, params)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnauthorized)
	})

	t.Run("UnexpectedUser", func(t *testing.T) {
		ctrl, _, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		params := &AddProjectParams{
			Name:     "fake-project",
			Owner:    "another-fake-name",
			Files:    model.FileCollection{},
			IsPublic: model.Personal,
		}
		_, err = ctrl.AddProject(ctx, params)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrForbidden)
	})

	t.Run("ClosedDB", func(t *testing.T) {
		ctrl, _, err := newTestController(t)
		require.NoError(t, err)
		ctrl.db.Close()

		ctx := newContextWithTestUser(context.Background())
		params := &AddProjectParams{
			Name:     "fake-project",
			Owner:    "fake-name",
			Files:    model.FileCollection{},
			IsPublic: model.Personal,
		}
		_, err = ctrl.AddProject(ctx, params)
		require.Error(t, err)
		assert.EqualError(t, err, "sql: database is closed")
	})
}

func TestUpdateProjectParamsValidate(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		params := &UpdateProjectParams{
			Files:    model.FileCollection{},
			IsPublic: model.Personal,
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("InvalidIsPublic", func(t *testing.T) {
		params := &UpdateProjectParams{
			Files:    model.FileCollection{},
			IsPublic: -1,
		}
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid isPublic", msg)
	})
}

func TestControllerUpdateProject(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		params := &UpdateProjectParams{
			Files:    model.FileCollection{},
			IsPublic: model.Public,
		}
		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "owner", "files", "is_public"}).
				AddRow(1, "fake-project", "fake-name", []byte("{}"), model.Personal))
		mock.ExpectExec(`UPDATE project SET u_time=\?,version=\?,files=\?,is_public=\? WHERE id=\?`).
			WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), model.Public, "1").
			WillReturnResult(sqlmock.NewResult(1, 1))
		mock.ExpectQuery(`SELECT \* FROM project WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "owner", "files", "is_public"}).
				AddRow(1, "fake-project", "fake-name", []byte("{}"), model.Public))
		project, err := ctrl.UpdateProject(ctx, "fake-name", "fake-project", params)
		require.NoError(t, err)
		require.NotNil(t, project)
		assert.Equal(t, "1", project.ID)
		assert.Equal(t, model.Public, project.IsPublic)
	})

	t.Run("NoUser", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := context.Background()
		params := &UpdateProjectParams{
			Files:    model.FileCollection{},
			IsPublic: model.Public,
		}
		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "owner", "files", "is_public"}).
				AddRow(1, "fake-project", "fake-name", []byte("{}"), model.Personal))
		_, err = ctrl.UpdateProject(ctx, "fake-name", "fake-project", params)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnauthorized)
	})

	t.Run("UnexpectedUser", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		params := &UpdateProjectParams{
			Files:    model.FileCollection{},
			IsPublic: model.Public,
		}
		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "owner", "files", "is_public"}).
				AddRow(1, "fake-project", "another-fake-name", []byte("{}"), model.Personal))
		_, err = ctrl.UpdateProject(ctx, "fake-name", "fake-project", params)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrForbidden)
	})

	t.Run("NoProject", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		params := &UpdateProjectParams{
			Files:    model.FileCollection{},
			IsPublic: model.Public,
		}
		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows(nil))
		_, err = ctrl.UpdateProject(ctx, "fake-name", "fake-project", params)
		require.Error(t, err)
		assert.ErrorIs(t, err, model.ErrNotExist)
	})

	t.Run("ClosedConnForUpdateQuery", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		params := &UpdateProjectParams{
			Files:    model.FileCollection{},
			IsPublic: model.Public,
		}
		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "owner", "files", "is_public"}).
				AddRow(1, "fake-project", "fake-name", []byte("{}"), model.Personal))
		mock.ExpectExec(`UPDATE project SET u_time=\?,version=\?,files=\?,is_public=\? WHERE id=\?`).
			WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), model.Public, "1").
			WillReturnError(sql.ErrConnDone)
		_, err = ctrl.UpdateProject(ctx, "fake-name", "fake-project", params)
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
	})
}

func TestControllerDeleteProject(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "owner"}).
				AddRow(1, "fake-project", "fake-name"))
		mock.ExpectExec(`UPDATE project SET u_time=\?,status=\? WHERE id=\?`).
			WithArgs(sqlmock.AnyArg(), model.StatusDeleted, "1").
			WillReturnResult(sqlmock.NewResult(1, 1))
		err = ctrl.DeleteProject(ctx, "fake-name", "fake-project")
		require.NoError(t, err)
	})

	t.Run("NoUser", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := context.Background()
		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "owner"}).
				AddRow(1, "fake-project", "fake-name"))
		err = ctrl.DeleteProject(ctx, "fake-name", "fake-project")
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnauthorized)
	})

	t.Run("UnexpectedUser", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "owner"}).
				AddRow(1, "fake-project", "another-fake-name"))
		err = ctrl.DeleteProject(ctx, "fake-name", "fake-project")
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrForbidden)
	})

	t.Run("NoProject", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows(nil))
		err = ctrl.DeleteProject(ctx, "fake-name", "fake-project")
		require.Error(t, err)
		assert.ErrorIs(t, err, model.ErrNotExist)
	})

	t.Run("ClosedConnForUpdateQuery", func(t *testing.T) {
		ctrl, mock, err := newTestController(t)
		require.NoError(t, err)

		ctx := newContextWithTestUser(context.Background())
		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "owner"}).
				AddRow(1, "fake-project", "fake-name"))
		mock.ExpectExec(`UPDATE project SET u_time=\?,status=\? WHERE id=\?`).
			WithArgs(sqlmock.AnyArg(), model.StatusDeleted, "1").
			WillReturnError(sql.ErrConnDone)
		err = ctrl.DeleteProject(ctx, "fake-name", "fake-project")
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
	})
}
