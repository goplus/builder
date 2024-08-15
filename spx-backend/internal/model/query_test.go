package model

import (
	"context"
	"database/sql"
	"testing"
	"time"

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
		paginatedUsers, err := QueryByPage[User](context.Background(), db, "user", Pagination{Index: 1, Size: 10}, nil, nil, false)
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
		paginatedUsers, err := QueryByPage[User](context.Background(), db, "user", Pagination{Index: 1, Size: 10}, nil, nil, false)
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
		paginatedUsers, err := QueryByPage[User](context.Background(), db, "user", Pagination{Index: 1, Size: 10}, nil, nil, false)
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
		paginatedUsers, err := QueryByPage[User](context.Background(), db, "user", Pagination{Index: 1, Size: 10}, nil, nil, false)
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
		require.NotNil(t, user)
		assert.Equal(t, User{ID: 1, Name: "foo", Status: StatusNormal}, *user)
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

func TestQueryByID(t *testing.T) {
	type User struct {
		ID     string `db:"id"`
		Name   string `db:"name"`
		Status Status `db:"status"`
	}

	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT \* FROM user WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "status"}).
				AddRow(1, "foo", StatusNormal))
		user, err := QueryByID[User](context.Background(), db, "user", "1")
		require.NoError(t, err)
		require.NotNil(t, user)
		assert.Equal(t, User{ID: "1", Name: "foo", Status: StatusNormal}, *user)
	})

	t.Run("NotExist", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery(`SELECT \* FROM user WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows(nil))
		user, err := QueryByID[User](context.Background(), db, "user", "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrNotExist)
		assert.Nil(t, user)
	})
}

func TestCreate(t *testing.T) {
	type User struct {
		ID     int       `db:"id"`
		CTime  time.Time `db:"c_time"`
		UTime  time.Time `db:"u_time"`
		Name   string    `db:"name"`
		Status Status    `db:"status"`
	}

	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`INSERT INTO user \(.+\) VALUES \(\?,\?,\?,\?\)`).
			WillReturnResult(sqlmock.NewResult(1, 1))
		mock.ExpectQuery(`SELECT \* FROM user WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "status"}).
				AddRow(1, "foo", StatusNormal))
		user, err := Create(context.Background(), db, "user", &User{Name: "foo", Status: StatusNormal})
		require.NoError(t, err)
		require.NotNil(t, user)
		assert.Equal(t, User{ID: 1, Name: "foo", Status: StatusNormal}, *user)
	})

	t.Run("InvalidType", func(t *testing.T) {
		db, _, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		var user int
		_, err = Create(context.Background(), db, "user", &user)
		require.Error(t, err)
		assert.EqualError(t, err, "item must be a struct")
	})

	t.Run("NoDBFields", func(t *testing.T) {
		db, _, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		var user struct{}
		_, err = Create(context.Background(), db, "user", &user)
		require.Error(t, err)
		assert.EqualError(t, err, "no db fields found")
	})

	t.Run("ClosedConnForInsertQuery", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`INSERT INTO user \(.+\) VALUES \(\?,\?,\?,\?\)`).
			WillReturnError(sql.ErrConnDone)
		_, err = Create(context.Background(), db, "user", &User{Name: "foo", Status: StatusNormal})
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
	})

	t.Run("ClosedConnForLastInsertID", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`INSERT INTO user \(.+\) VALUES \(\?,\?,\?,\?\)`).
			WillReturnResult(sqlmock.NewErrorResult(sql.ErrConnDone))
		_, err = Create(context.Background(), db, "user", &User{Name: "foo", Status: StatusNormal})
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
	})
}

func TestUpdateByID(t *testing.T) {
	type User struct {
		ID     string    `db:"id"`
		CTime  time.Time `db:"c_time"`
		UTime  time.Time `db:"u_time"`
		Name   string    `db:"name"`
		Status Status    `db:"status"`
	}

	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE user SET u_time=\?,name=\? WHERE id=\?`).
			WithArgs(sqlmock.AnyArg(), "foo", "1").
			WillReturnResult(sqlmock.NewResult(0, 1))
		mock.ExpectQuery(`SELECT \* FROM user WHERE id = \? AND status != \? ORDER BY id ASC LIMIT 1`).
			WillReturnRows(mock.NewRows([]string{"id", "name", "status"}).
				AddRow("1", "foo", StatusNormal))
		err = UpdateByID(context.Background(), db, "user", "1", &User{Name: "foo"}, "name")
		require.NoError(t, err)
	})

	t.Run("InvalidType", func(t *testing.T) {
		db, _, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		var user int
		err = UpdateByID(context.Background(), db, "user", "1", &user, "name")
		require.Error(t, err)
		assert.EqualError(t, err, "item must be a struct")
	})

	t.Run("ColumnNotExist", func(t *testing.T) {
		db, _, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		var user struct{}
		err = UpdateByID(context.Background(), db, "user", "1", &user, "name")
		require.Error(t, err)
		assert.EqualError(t, err, "column name does not exist in struct")
	})

	t.Run("ReadOnlyColumn", func(t *testing.T) {
		db, _, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		var user User
		err = UpdateByID(context.Background(), db, "user", "1", &user, "id")
		require.Error(t, err)
		assert.EqualError(t, err, "column id is read-only")
	})

	t.Run("NotExist", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE user SET u_time=\?,name=\? WHERE id=\?`).
			WithArgs(sqlmock.AnyArg(), "foo", "1").
			WillReturnResult(sqlmock.NewResult(0, 0))
		err = UpdateByID(context.Background(), db, "user", "1", &User{Name: "foo"}, "name")
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrNotExist)
	})

	t.Run("ClosedConnForUpdateQuery", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE user SET u_time=\?,name=\? WHERE id=\?`).
			WithArgs(sqlmock.AnyArg(), "foo", "1").
			WillReturnError(sql.ErrConnDone)
		err = UpdateByID(context.Background(), db, "user", "1", &User{Name: "foo"}, "name")
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
	})

	t.Run("ClosedConnForRowsAffected", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectExec(`UPDATE user SET u_time=\?,name=\? WHERE id=\?`).
			WithArgs(sqlmock.AnyArg(), "foo", "1").
			WillReturnResult(sqlmock.NewErrorResult(sql.ErrConnDone))
		err = UpdateByID(context.Background(), db, "user", "1", &User{Name: "foo"}, "name")
		require.Error(t, err)
		assert.ErrorIs(t, err, sql.ErrConnDone)
	})
}

func TestGetLikedInfo(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		assetIDs := []string{"1", "2"}
		query := `SELECT asset_id, COUNT\(\*\) as count FROM user_asset WHERE asset_id IN \(\?,\?\) AND relation_type = 'liked' GROUP BY asset_id`

		rows := sqlmock.NewRows([]string{"asset_id", "count"}).
			AddRow("1", 5).
			AddRow("2", 3)
		mock.ExpectQuery(query).WithArgs("1", "2").WillReturnRows(rows)

		ctx := context.Background()
		result, err := getLikedInfo(ctx, db, assetIDs)
		require.NoError(t, err)
		expected := map[string]struct {
			IsLiked   bool
			LikeCount int
		}{
			"1": {IsLiked: true, LikeCount: 5},
			"2": {IsLiked: true, LikeCount: 3},
		}
		assert.Equal(t, expected, result)
	})

	t.Run("EmptyAssetIDs", func(t *testing.T) {
		db, _, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		ctx := context.Background()
		result, err := getLikedInfo(ctx, db, []string{})
		require.NoError(t, err)
		assert.Nil(t, result)
	})

	t.Run("QueryFailure", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		assetIDs := []string{"1", "2"}
		query := `SELECT asset_id, COUNT\(\*\) as count FROM user_asset WHERE asset_id IN \(\?,\?\) AND relation_type = 'liked' GROUP BY asset_id`

		mock.ExpectQuery(query).WithArgs("1", "2").WillReturnError(sql.ErrConnDone)

		ctx := context.Background()
		result, err := getLikedInfo(ctx, db, assetIDs)
		require.Error(t, err)
		assert.Nil(t, result)
		assert.ErrorIs(t, err, sql.ErrConnDone)
	})

	t.Run("ScanFailure", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		assetIDs := []string{"1", "2"}
		query := `SELECT asset_id, COUNT\(\*\) as count FROM user_asset WHERE asset_id IN \(\?,\?\) AND relation_type = 'liked' GROUP BY asset_id`

		rows := sqlmock.NewRows([]string{"asset_id", "count"}).
			AddRow("1", 5).
			AddRow("2", "invalid count")
		mock.ExpectQuery(query).WithArgs("1", "2").WillReturnRows(rows)

		ctx := context.Background()
		result, err := getLikedInfo(ctx, db, assetIDs)
		require.Error(t, err)
		assert.Nil(t, result)
	})

	t.Run("RowsError", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		assetIDs := []string{"1", "2"}
		query := `SELECT asset_id, COUNT\(\*\) as count FROM user_asset WHERE asset_id IN \(\?,\?\) AND relation_type = 'liked' GROUP BY asset_id`

		rows := sqlmock.NewRows([]string{"asset_id", "count"}).
			AddRow("1", 5).
			AddRow("2", 3).
			RowError(1, sql.ErrConnDone)
		mock.ExpectQuery(query).WithArgs("1", "2").WillReturnRows(rows)

		ctx := context.Background()
		result, err := getLikedInfo(ctx, db, assetIDs)
		require.Error(t, err)
		assert.Nil(t, result)
		assert.ErrorIs(t, err, sql.ErrConnDone)
	})
}
