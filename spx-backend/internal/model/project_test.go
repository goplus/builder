package model

import (
	"context"
	"database/sql"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestProjectByID(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT \* FROM project WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"name"}).
				AddRow("foo"))
		project, err := ProjectByID(context.Background(), db, "1")
		require.NoError(t, err)
		require.NotNil(t, project)
		assert.Equal(t, "foo", project.Name)
	})

	t.Run("NotExist", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT \* FROM project WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows(nil))
		project, err := ProjectByID(context.Background(), db, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrNotExist)
		assert.Nil(t, project)
	})
}

func TestProjectByOwnerAndName(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"name"}).
				AddRow("foo"))
		project, err := ProjectByOwnerAndName(context.Background(), db, "owner", "name")
		require.NoError(t, err)
		require.NotNil(t, project)
		assert.Equal(t, "foo", project.Name)
	})

	t.Run("NotExist", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows(nil))
		project, err := ProjectByOwnerAndName(context.Background(), db, "owner", "name")
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrNotExist)
		assert.Nil(t, project)
	})
}

func TestListProjects(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT COUNT\(\*\) FROM project WHERE status != \?`).
			WillReturnRows(mock.NewRows([]string{"COUNT(*)"}).
				AddRow(1))
		mock.ExpectQuery(`SELECT \* FROM project WHERE status != \? ORDER BY id ASC LIMIT \?, \?`).
			WillReturnRows(mock.NewRows([]string{"name"}).
				AddRow("foo"))
		projects, err := ListProjects(context.Background(), db, Pagination{Index: 1, Size: 1}, nil, nil)
		require.NoError(t, err)
		require.NotNil(t, projects)
		assert.Equal(t, 1, projects.Total)
		assert.Len(t, projects.Data, 1)
		assert.Equal(t, "foo", projects.Data[0].Name)
	})

	t.Run("ClosedConnForCountQuery", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT COUNT\(\*\) FROM project WHERE status != \?`).
			WillReturnError(sql.ErrConnDone)
		projects, err := ListProjects(context.Background(), db, Pagination{Index: 1, Size: 1}, nil, nil)
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
		assert.Nil(t, projects)
	})
}

func TestAddProject(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows(nil))
		mock.ExpectExec(`INSERT INTO project \(c_time, u_time, name, owner, version, files, is_public, status\) VALUES \(\?,\?,\?,\?,\?,\?,\?,\?\)`).
			WillReturnResult(sqlmock.NewResult(1, 1))
		mock.ExpectQuery(`SELECT \* FROM project WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"name"}).
				AddRow("foo"))
		project, err := AddProject(context.Background(), db, &Project{Name: "foo", Owner: "owner"})
		require.NoError(t, err)
		require.NotNil(t, project)
		assert.Equal(t, "foo", project.Name)
	})

	t.Run("Exist", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"name"}).
				AddRow("foo"))
		project, err := AddProject(context.Background(), db, &Project{Name: "foo", Owner: "owner"})
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrExist)
		assert.Nil(t, project)
	})

	t.Run("ClosedConnForProjectByOwnerAndName", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnError(sql.ErrConnDone)
		project, err := AddProject(context.Background(), db, &Project{Name: "foo", Owner: "owner"})
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
		assert.Nil(t, project)
	})

	t.Run("ClosedConnForInsertQuery", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows(nil))
		mock.ExpectExec(`INSERT INTO project \(c_time, u_time, name, owner, version, files, is_public, status\) VALUES \(\?,\?,\?,\?,\?,\?,\?,\?\)`).
			WillReturnError(sql.ErrConnDone)
		project, err := AddProject(context.Background(), db, &Project{Name: "foo", Owner: "owner"})
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
		assert.Nil(t, project)
	})

	t.Run("ClosedConnForLastInsertID", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT \* FROM project WHERE owner = \? AND name = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows(nil))
		mock.ExpectExec(`INSERT INTO project \(c_time, u_time, name, owner, version, files, is_public, status\) VALUES \(\?,\?,\?,\?,\?,\?,\?,\?\)`).
			WillReturnResult(sqlmock.NewErrorResult(sql.ErrConnDone))
		project, err := AddProject(context.Background(), db, &Project{Name: "foo", Owner: "owner"})
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
		assert.Nil(t, project)
	})
}

func TestUpdateProjectByID(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE project SET u_time = \?, version = \?, files = \?, is_public = \? WHERE id = \?`).
			WillReturnResult(sqlmock.NewResult(1, 1))
		mock.ExpectQuery(`SELECT \* FROM project WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"name"}).
				AddRow("foo"))
		project, err := UpdateProjectByID(context.Background(), db, "1", &Project{Name: "foo"})
		require.NoError(t, err)
		require.NotNil(t, project)
		assert.Equal(t, "foo", project.Name)
	})

	t.Run("NotExist", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE project SET u_time = \?, version = \?, files = \?, is_public = \? WHERE id = \?`).
			WillReturnResult(sqlmock.NewResult(1, 0))
		project, err := UpdateProjectByID(context.Background(), db, "1", &Project{Name: "foo"})
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrNotExist)
		assert.Nil(t, project)
	})

	t.Run("ClosedConnForUpdateQuery", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE project SET u_time = \?, version = \?, files = \?, is_public = \? WHERE id = \?`).
			WillReturnError(sql.ErrConnDone)
		project, err := UpdateProjectByID(context.Background(), db, "1", &Project{Name: "foo"})
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
		assert.Nil(t, project)
	})

	t.Run("ClosedConnForRowsAffected", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE project SET u_time = \?, version = \?, files = \?, is_public = \? WHERE id = \?`).
			WillReturnResult(sqlmock.NewErrorResult(sql.ErrConnDone))
		project, err := UpdateProjectByID(context.Background(), db, "1", &Project{Name: "foo"})
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
		assert.Nil(t, project)
	})
}

func TestDeleteProjectByID(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE project SET status = \? WHERE id = \?`).
			WillReturnResult(sqlmock.NewResult(1, 1))
		err = DeleteProjectByID(context.Background(), db, "1")
		require.NoError(t, err)
	})

	t.Run("ClosedConnForDeleteQuery", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE project SET status = \? WHERE id = \?`).
			WillReturnError(sql.ErrConnDone)
		err = DeleteProjectByID(context.Background(), db, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
	})
}
