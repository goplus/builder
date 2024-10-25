package model

import (
	"context"
	"database/sql/driver"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/casdoor/casdoor-go-sdk/casdoorsdk"
	"github.com/goplus/builder/spx-backend/internal/model/modeltest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestFirstOrCreateUser(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, User{})
	require.NoError(t, err)

	expectedCasdoorUser := casdoorsdk.User{
		Name:        "john",
		DisplayName: "John Doe",
		Avatar:      "https://example.com/avatar.jpg",
	}

	mExpectedUser := User{
		Model:              Model{ID: 1},
		Username:           expectedCasdoorUser.Name,
		DisplayName:        expectedCasdoorUser.DisplayName,
		Avatar:             expectedCasdoorUser.Avatar,
		Description:        "I'm John",
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

		mUser, err := FirstOrCreateUser(context.Background(), db, &expectedCasdoorUser)
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

		mUser, err := FirstOrCreateUser(context.Background(), db, &expectedCasdoorUser)
		require.NoError(t, err)
		assert.Equal(t, mExpectedUser, *mUser)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}
