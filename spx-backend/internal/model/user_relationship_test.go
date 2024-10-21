package model

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/goplus/builder/spx-backend/internal/model/modeltest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func TestFirstOrCreateUserRelationship(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userRelationshipDBColumns, err := modeltest.ExtractDBColumns(db, UserRelationship{})
	require.NoError(t, err)
	generateUserRelationshipDBRows, err := modeltest.NewDBRowsGenerator(db, UserRelationship{})
	require.NoError(t, err)

	mExpectedUserRelationship := UserRelationship{
		Model:        Model{ID: 1},
		UserID:       1,
		TargetUserID: 2,
		FollowedAt:   sql.NullTime{Valid: true},
	}

	t.Run("Normal", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		dbMockStmt := db.Session(&gorm.Session{DryRun: true}).
			Where("user_id = ?", mExpectedUserRelationship.UserID).
			Where("target_user_id = ?", mExpectedUserRelationship.TargetUserID).
			First(&UserRelationship{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userRelationshipDBColumns).AddRows(generateUserRelationshipDBRows(mExpectedUserRelationship)...))

		mUserRelationship, err := FirstOrCreateUserRelationship(context.Background(), db, mExpectedUserRelationship.UserID, mExpectedUserRelationship.TargetUserID)
		require.NoError(t, err)
		assert.Equal(t, mExpectedUserRelationship, *mUserRelationship)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("NotExist", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		dbMockStmt := db.Session(&gorm.Session{DryRun: true}).
			Where("user_id = ?", mExpectedUserRelationship.UserID).
			Where("target_user_id = ?", mExpectedUserRelationship.TargetUserID).
			First(&UserRelationship{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userRelationshipDBColumns))

		dbMock.ExpectBegin()

		dbMockStmt = db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "user_id"}, {Name: "target_user_id"}},
				DoNothing: true,
			}).
			Create(&UserRelationship{UserID: mExpectedUserRelationship.UserID, TargetUserID: mExpectedUserRelationship.TargetUserID}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg() // CreatedAt
		dbMockArgs[1] = sqlmock.AnyArg() // UpdatedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(driver.ResultNoRows)

		dbMock.ExpectCommit()

		dbMockStmt = db.Session(&gorm.Session{DryRun: true}).
			Where("user_id = ?", mExpectedUserRelationship.UserID).
			Where("target_user_id = ?", mExpectedUserRelationship.TargetUserID).
			First(&UserRelationship{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userRelationshipDBColumns).AddRows(generateUserRelationshipDBRows(mExpectedUserRelationship)...))

		mUserRelationship, err := FirstOrCreateUserRelationship(context.Background(), db, mExpectedUserRelationship.UserID, mExpectedUserRelationship.TargetUserID)
		require.NoError(t, err)
		assert.Equal(t, mExpectedUserRelationship, *mUserRelationship)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}
