package model

import (
	"context"
	"database/sql/driver"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/goplus/builder/spx-backend/internal/model/modeltest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestUserString(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ur := UserRoles{"admin", "moderator", "user"}
		assert.Equal(t, "admin,moderator,user", ur.String())
	})

	t.Run("SingleRole", func(t *testing.T) {
		ur := UserRoles{"admin"}
		assert.Equal(t, "admin", ur.String())
	})

	t.Run("Empty", func(t *testing.T) {
		ur := UserRoles{}
		assert.Empty(t, ur.String())
	})

	t.Run("Nil", func(t *testing.T) {
		var ur UserRoles
		assert.Empty(t, ur.String())
	})
}

func TestUserRolesScan(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		var ur UserRoles
		err := ur.Scan("admin,moderator,user")
		require.NoError(t, err)
		assert.Equal(t, UserRoles{"admin", "moderator", "user"}, ur)
	})

	t.Run("SingleRole", func(t *testing.T) {
		var ur UserRoles
		err := ur.Scan("admin")
		require.NoError(t, err)
		assert.Equal(t, UserRoles{"admin"}, ur)
	})

	t.Run("EmptyString", func(t *testing.T) {
		var ur UserRoles
		err := ur.Scan("")
		require.NoError(t, err)
		assert.Nil(t, ur)
	})

	t.Run("ByteSlice", func(t *testing.T) {
		var ur UserRoles
		err := ur.Scan([]byte("admin,moderator"))
		require.NoError(t, err)
		assert.Equal(t, UserRoles{"admin", "moderator"}, ur)
	})

	t.Run("EmptyByteSlice", func(t *testing.T) {
		var ur UserRoles
		err := ur.Scan([]byte(""))
		require.NoError(t, err)
		assert.Nil(t, ur)
	})

	t.Run("Nil", func(t *testing.T) {
		var ur UserRoles
		err := ur.Scan(nil)
		require.NoError(t, err)
		assert.Nil(t, ur)
	})

	t.Run("IncompatibleType", func(t *testing.T) {
		var ur UserRoles
		err := ur.Scan(123)
		require.Error(t, err)
		assert.EqualError(t, err, "incompatible type for UserRoles")
	})
}

func TestUserRolesValue(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ur := UserRoles{"admin", "moderator", "user"}
		v, err := ur.Value()
		require.NoError(t, err)
		assert.Equal(t, "admin,moderator,user", v)
	})

	t.Run("SingleRole", func(t *testing.T) {
		ur := UserRoles{"admin"}
		v, err := ur.Value()
		require.NoError(t, err)
		assert.Equal(t, "admin", v)
	})

	t.Run("Empty", func(t *testing.T) {
		ur := UserRoles{}
		v, err := ur.Value()
		require.NoError(t, err)
		assert.Equal(t, "", v)
	})

	t.Run("Nil", func(t *testing.T) {
		var ur UserRoles
		v, err := ur.Value()
		require.NoError(t, err)
		assert.Equal(t, "", v)
	})
}

func TestParseUserPlan(t *testing.T) {
	t.Run("Free", func(t *testing.T) {
		up, err := ParseUserPlan("free")
		require.NoError(t, err)
		assert.Equal(t, UserPlanFree, up)
	})

	t.Run("Plus", func(t *testing.T) {
		up, err := ParseUserPlan("plus")
		require.NoError(t, err)
		assert.Equal(t, UserPlanPlus, up)
	})

	t.Run("Invalid", func(t *testing.T) {
		_, err := ParseUserPlan("invalid")
		assert.EqualError(t, err, "invalid user plan: invalid")
	})

	t.Run("Empty", func(t *testing.T) {
		_, err := ParseUserPlan("")
		assert.EqualError(t, err, "invalid user plan: ")
	})
}

func TestUserPlanString(t *testing.T) {
	t.Run("Free", func(t *testing.T) {
		up := UserPlanFree
		assert.Equal(t, "free", up.String())
	})

	t.Run("Plus", func(t *testing.T) {
		up := UserPlanPlus
		assert.Equal(t, "plus", up.String())
	})

	t.Run("Invalid", func(t *testing.T) {
		up := UserPlan(255)
		assert.Equal(t, "UserPlan(255)", up.String())
	})
}

func TestUserPlanMarshalText(t *testing.T) {
	t.Run("Free", func(t *testing.T) {
		up := UserPlanFree
		text, err := up.MarshalText()
		require.NoError(t, err)
		assert.Equal(t, []byte("free"), text)
	})

	t.Run("Plus", func(t *testing.T) {
		up := UserPlanPlus
		text, err := up.MarshalText()
		require.NoError(t, err)
		assert.Equal(t, []byte("plus"), text)
	})

	t.Run("Invalid", func(t *testing.T) {
		up := UserPlan(255)
		_, err := up.MarshalText()
		assert.EqualError(t, err, "invalid user plan: 255")
	})
}

func TestUserPlanUnmarshalText(t *testing.T) {
	t.Run("Free", func(t *testing.T) {
		var up UserPlan
		err := up.UnmarshalText([]byte("free"))
		require.NoError(t, err)
		assert.Equal(t, UserPlanFree, up)
	})

	t.Run("Plus", func(t *testing.T) {
		var up UserPlan
		err := up.UnmarshalText([]byte("plus"))
		require.NoError(t, err)
		assert.Equal(t, UserPlanPlus, up)
	})

	t.Run("Invalid", func(t *testing.T) {
		var up UserPlan
		err := up.UnmarshalText([]byte("invalid"))
		assert.EqualError(t, err, "invalid user plan: invalid")
	})

	t.Run("Empty", func(t *testing.T) {
		var up UserPlan
		err := up.UnmarshalText([]byte(""))
		assert.EqualError(t, err, "invalid user plan: ")
	})
}

func TestFirstOrCreateUser(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, User{})
	require.NoError(t, err)

	wantAttrs := CreateUserAttrs{
		Username:    "john",
		DisplayName: "John Doe",
		Avatar:      "https://example.com/avatar.jpg",
		Roles:       UserRoles{"assetAdmin"},
		Plan:        UserPlanPlus,
	}

	mExpectedUser := User{
		Model:              Model{ID: 1},
		Username:           wantAttrs.Username,
		DisplayName:        wantAttrs.DisplayName,
		Avatar:             wantAttrs.Avatar,
		Description:        "I'm John",
		Roles:              wantAttrs.Roles,
		Plan:               wantAttrs.Plan,
		FollowerCount:      10,
		FollowingCount:     5,
		ProjectCount:       3,
		PublicProjectCount: 2,
		LikedProjectCount:  15,
	}

	t.Run("Normal", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		dbMockStmt := db.Session(&gorm.Session{DryRun: true}).
			Where("username = ?", mExpectedUser.Username).
			First(&User{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(mExpectedUser)...))

		mUser, err := FirstOrCreateUser(context.Background(), db, wantAttrs)
		require.NoError(t, err)
		assert.Equal(t, mExpectedUser, *mUser)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("NotExist", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		dbMockStmt := db.Session(&gorm.Session{DryRun: true}).
			Where("username = ?", mExpectedUser.Username).
			First(&User{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns))

		dbMock.ExpectBegin()

		dbMockStmt = db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Create(&User{
				Username:    mExpectedUser.Username,
				DisplayName: mExpectedUser.DisplayName,
				Avatar:      mExpectedUser.Avatar,
				Roles:       mExpectedUser.Roles,
				Plan:        mExpectedUser.Plan,
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg() // CreatedAt
		dbMockArgs[1] = sqlmock.AnyArg() // UpdatedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(driver.ResultNoRows)

		dbMock.ExpectCommit()

		dbMockStmt = db.Session(&gorm.Session{DryRun: true}).
			Where("username = ?", mExpectedUser.Username).
			First(&User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(mExpectedUser)...))

		mUser, err := FirstOrCreateUser(context.Background(), db, wantAttrs)
		require.NoError(t, err)
		assert.Equal(t, mExpectedUser, *mUser)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("WithEmptyRoles", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		emptyAttrs := CreateUserAttrs{
			Username:    "john",
			DisplayName: "John Doe",
			Avatar:      "https://example.com/john.jpg",
			Roles:       nil,
			Plan:        UserPlanFree,
		}

		wantUser := User{
			Model:       Model{ID: 2},
			Username:    "john",
			DisplayName: "John Doe",
			Avatar:      "https://example.com/john.jpg",
			Roles:       nil,
			Plan:        UserPlanFree,
		}

		dbMockStmt := db.Session(&gorm.Session{DryRun: true}).
			Where("username = ?", wantUser.Username).
			First(&User{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(wantUser)...))

		mUser, err := FirstOrCreateUser(context.Background(), db, emptyAttrs)
		require.NoError(t, err)
		assert.Equal(t, wantUser, *mUser)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("WithMultipleRoles", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		multiRoleAttrs := CreateUserAttrs{
			Username:    "admin",
			DisplayName: "Super Admin",
			Avatar:      "https://example.com/admin.jpg",
			Roles:       UserRoles{"assetAdmin", "moderator", "superuser"},
			Plan:        UserPlanPlus,
		}

		wantUser := User{
			Model:       Model{ID: 3},
			Username:    "admin",
			DisplayName: "Super Admin",
			Avatar:      "https://example.com/admin.jpg",
			Roles:       UserRoles{"assetAdmin", "moderator", "superuser"},
			Plan:        UserPlanPlus,
		}

		dbMockStmt := db.Session(&gorm.Session{DryRun: true}).
			Where("username = ?", wantUser.Username).
			First(&User{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(wantUser)...))

		mUser, err := FirstOrCreateUser(context.Background(), db, multiRoleAttrs)
		require.NoError(t, err)
		assert.Equal(t, wantUser, *mUser)
		assert.Contains(t, mUser.Roles, "assetAdmin")
		assert.Contains(t, mUser.Roles, "moderator")
		assert.Contains(t, mUser.Roles, "superuser")
		assert.Equal(t, UserPlanPlus, mUser.Plan)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}
