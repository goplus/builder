package model

import (
	"reflect"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReflectModelDBFields(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		type User struct {
			ID   int    `db:"id"`
			Name string `db:"name"`
		}
		fields := reflectModelDBFields(reflect.TypeOf(User{}))
		require.NotNil(t, fields)
		assert.Contains(t, fields, "id")
		assert.Contains(t, fields, "name")
	})

	t.Run("UnexportedField", func(t *testing.T) {
		type User struct {
			ID   int    `db:"id"`
			name string `db:"name"`
		}
		fields := reflectModelDBFields(reflect.TypeOf(User{}))
		require.NotNil(t, fields)
		assert.Contains(t, fields, "id")
		assert.NotContains(t, fields, "name")
	})

	t.Run("NoDBTag", func(t *testing.T) {
		type User struct {
			ID   int
			Name string
		}
		fields := reflectModelDBFields(reflect.TypeOf(User{}))
		require.NotNil(t, fields)
		assert.Empty(t, fields)
	})
}

func TestReflectModelItem(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		type User struct {
			ID   int    `db:"id"`
			Name string `db:"name"`
		}
		user := User{}
		value, fields, err := reflectModelItem(&user)
		require.NoError(t, err)
		assert.NotZero(t, value)
		assert.NotEmpty(t, fields)
	})

	t.Run("InvalidType", func(t *testing.T) {
		var user int
		value, fields, err := reflectModelItem(&user)
		require.Error(t, err)
		assert.EqualError(t, err, "item must be a struct")
		assert.Zero(t, value)
		assert.Empty(t, fields)
	})
}

func TestRowsScan(t *testing.T) {
	type User struct {
		ID   int    `db:"id"`
		Name string `db:"name"`
	}

	t.Run("Normal", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		var users []User
		mock.ExpectQuery("SELECT id, name FROM user").
			WillReturnRows(mock.NewRows([]string{"id", "name"}).
				AddRow(1, "foo").
				AddRow(2, "bar"))
		rows, err := db.Query("SELECT id, name FROM user")
		require.NoError(t, err)
		defer rows.Close()
		for rows.Next() {
			user, err := rowsScan[User](rows)
			require.NoError(t, err)
			assert.NotZero(t, user)
			users = append(users, user)
		}
		require.Len(t, users, 2)
		assert.Equal(t, User{ID: 1, Name: "foo"}, users[0])
		assert.Equal(t, User{ID: 2, Name: "bar"}, users[1])
	})

	t.Run("InvalidType", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery("SELECT id, name FROM user").
			WillReturnRows(mock.NewRows([]string{"id", "name"}).
				AddRow(1, "foo"))
		rows, err := db.Query("SELECT id, name FROM user")
		require.NoError(t, err)
		defer rows.Close()
		for rows.Next() {
			user, err := rowsScan[int](rows)
			require.Error(t, err)
			assert.EqualError(t, err, "item must be a struct")
			assert.Zero(t, user)
		}
	})

	t.Run("NULL", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery("SELECT id, name FROM user").
			WillReturnRows(mock.NewRows([]string{"id", "name"}).
				AddRow(1, nil))
		rows, err := db.Query("SELECT id, name FROM user")
		require.NoError(t, err)
		defer rows.Close()
		for rows.Next() {
			_, err := rowsScan[User](rows)
			require.Error(t, err)
			assert.Contains(t, err.Error(), "converting NULL to string is unsupported")
		}
	})

	t.Run("ColumnNotExist", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery("SELECT id, name, age FROM user").
			WillReturnRows(mock.NewRows([]string{"id", "name", "age"}).
				AddRow(1, "foo", 18))
		rows, err := db.Query("SELECT id, name, age FROM user")
		require.NoError(t, err)
		defer rows.Close()
		for rows.Next() {
			user, err := rowsScan[User](rows)
			require.Error(t, err)
			assert.EqualError(t, err, "column age does not exist in struct")
			assert.Zero(t, user)
		}
	})

	t.Run("ClosedRows", func(t *testing.T) {
		db, mock, err := sqlmock.New()
		require.NoError(t, err)
		defer db.Close()

		mock.ExpectQuery("SELECT id, name FROM user").
			WillReturnRows(mock.NewRows([]string{"id", "name"}).
				AddRow(1, "foo"))
		rows, err := db.Query("SELECT id, name FROM user")
		require.NoError(t, err)
		defer rows.Close()
		for rows.Next() {
			require.NoError(t, rows.Close())
			user, err := rowsScan[User](rows)
			require.Error(t, err)
			assert.EqualError(t, err, "sql: Rows are closed")
			assert.Zero(t, user)
		}
	})
}
