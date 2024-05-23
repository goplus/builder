package model

import (
	"context"
	"database/sql"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestQuery(t *testing.T) {
	type User struct {
		ID     int    `db:"id"`
		Name   string `db:"name"`
		Status Status `db:"status"`
	}

	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT \* FROM user WHERE status != \? ORDER BY id ASC`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "status"}).
				AddRow(1, "foo", StatusNormal))
		users, err := Query[User](context.Background(), db, "user", nil, nil)
		require.NoError(t, err)
		require.Len(t, users, 1)
		assert.Equal(t, User{ID: 1, Name: "foo", Status: StatusNormal}, users[0])
	})

	t.Run("ClosedConn", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT \* FROM user WHERE status != \? ORDER BY id ASC`).
			WillReturnError(sql.ErrConnDone)
		users, err := Query[User](context.Background(), db, "user", nil, nil)
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
		assert.Nil(t, users)
	})

	t.Run("ScanError", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT \* FROM user WHERE status != \? ORDER BY id ASC`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "age", "status"}).
				AddRow(1, "foo", 18, StatusNormal))
		users, err := Query[User](context.Background(), db, "user", nil, nil)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "column age does not exist in struct")
		assert.Nil(t, users)
	})
}

func TestQueryByPage(t *testing.T) {
	type User struct {
		ID     int    `db:"id"`
		Name   string `db:"name"`
		Status Status `db:"status"`
	}

	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT COUNT\(\*\) FROM user WHERE status != \?`).
			WillReturnRows(mock.NewRows([]string{"count"}).
				AddRow(1))
		mock.ExpectQuery(`SELECT \* FROM user WHERE status != \? ORDER BY id ASC LIMIT \?, \?`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "status"}).
				AddRow(1, "foo", StatusNormal))
		paginatedUsers, err := QueryByPage[User](context.Background(), db, "user", Pagination{Index: 1, Size: 10}, nil, nil)
		require.NoError(t, err)
		assert.Equal(t, 1, paginatedUsers.Total)
		require.Len(t, paginatedUsers.Data, 1)
		assert.Equal(t, User{ID: 1, Name: "foo", Status: StatusNormal}, paginatedUsers.Data[0])
	})

	t.Run("ClosedConnForCountQuery", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT COUNT\(\*\) FROM user WHERE status != \?`).
			WillReturnError(sql.ErrConnDone)
		paginatedUsers, err := QueryByPage[User](context.Background(), db, "user", Pagination{Index: 1, Size: 10}, nil, nil)
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
		assert.Nil(t, paginatedUsers)
	})

	t.Run("ClosedConnForDataQuery", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT COUNT\(\*\) FROM user WHERE status != \?`).
			WillReturnRows(mock.NewRows([]string{"count"}).
				AddRow(1))
		mock.ExpectQuery(`SELECT \* FROM user WHERE status != \? ORDER BY id ASC LIMIT \?, \?`).
			WillReturnError(sql.ErrConnDone)
		paginatedUsers, err := QueryByPage[User](context.Background(), db, "user", Pagination{Index: 1, Size: 10}, nil, nil)
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
		assert.Nil(t, paginatedUsers)
	})

	t.Run("ScanError", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT COUNT\(\*\) FROM user WHERE status != \?`).
			WillReturnRows(mock.NewRows([]string{"count"}).
				AddRow(1))
		mock.ExpectQuery(`SELECT \* FROM user WHERE status != \? ORDER BY id ASC LIMIT \?, \?`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "age", "status"}).
				AddRow(1, "foo", 18, StatusNormal))
		paginatedUsers, err := QueryByPage[User](context.Background(), db, "user", Pagination{Index: 1, Size: 10}, nil, nil)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "column age does not exist in struct")
		assert.Nil(t, paginatedUsers)
	})
}

func TestQueryFirst(t *testing.T) {
	type User struct {
		ID     int    `db:"id"`
		Name   string `db:"name"`
		Status Status `db:"status"`
	}

	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT \* FROM user WHERE status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "status"}).
				AddRow(1, "foo", StatusNormal))
		user, err := QueryFirst[User](context.Background(), db, "user", nil, nil)
		require.NoError(t, err)
		assert.Equal(t, &User{ID: 1, Name: "foo", Status: StatusNormal}, user)
	})

	t.Run("NotExist", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT \* FROM user WHERE status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows(nil))
		user, err := QueryFirst[User](context.Background(), db, "user", nil, nil)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrNotExist)
		assert.Nil(t, user)
	})

	t.Run("ClosedConn", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT \* FROM user WHERE status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnError(sql.ErrConnDone)
		user, err := QueryFirst[User](context.Background(), db, "user", nil, nil)
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
		assert.Nil(t, user)
	})

	t.Run("ScanError", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT \* FROM user WHERE status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "age", "status"}).
				AddRow(1, "foo", 18, StatusNormal))
		user, err := QueryFirst[User](context.Background(), db, "user", nil, nil)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "column age does not exist in struct")
		assert.Nil(t, user)
	})
}
