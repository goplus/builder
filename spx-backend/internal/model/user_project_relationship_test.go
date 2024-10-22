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

func TestFirstOrCreateUserProjectRelationship(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userProjectRelationshipDBColumns, err := modeltest.ExtractDBColumns(db, UserProjectRelationship{})
	require.NoError(t, err)
	generateUserProjectRelationshipDBRows, err := modeltest.NewDBRowsGenerator(db, UserProjectRelationship{})
	require.NoError(t, err)

	mExpectedUserProjectRelationship := UserProjectRelationship{
		Model:        Model{ID: 1},
		UserID:       1,
		ProjectID:    2,
		ViewCount:    10,
		LastViewedAt: sql.NullTime{Valid: true},
		LikedAt:      sql.NullTime{Valid: true},
	}

	t.Run("Normal", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		dbMockStmt := db.Session(&gorm.Session{DryRun: true}).
			Where("user_id = ?", mExpectedUserProjectRelationship.UserID).
			Where("project_id = ?", mExpectedUserProjectRelationship.ProjectID).
			First(&UserProjectRelationship{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userProjectRelationshipDBColumns).AddRows(generateUserProjectRelationshipDBRows(mExpectedUserProjectRelationship)...))

		mUserProjectRelationship, err := FirstOrCreateUserProjectRelationship(context.Background(), db, mExpectedUserProjectRelationship.UserID, mExpectedUserProjectRelationship.ProjectID)
		require.NoError(t, err)
		assert.Equal(t, mExpectedUserProjectRelationship, *mUserProjectRelationship)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("NotExist", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		dbMockStmt := db.Session(&gorm.Session{DryRun: true}).
			Where("user_id = ?", mExpectedUserProjectRelationship.UserID).
			Where("project_id = ?", mExpectedUserProjectRelationship.ProjectID).
			First(&UserProjectRelationship{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userProjectRelationshipDBColumns))

		dbMock.ExpectBegin()

		dbMockStmt = db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "user_id"}, {Name: "project_id"}},
				DoNothing: true,
			}).
			Create(&UserProjectRelationship{UserID: mExpectedUserProjectRelationship.UserID, ProjectID: mExpectedUserProjectRelationship.ProjectID}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg() // CreatedAt
		dbMockArgs[1] = sqlmock.AnyArg() // UpdatedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(driver.ResultNoRows)

		dbMock.ExpectCommit()

		dbMockStmt = db.Session(&gorm.Session{DryRun: true}).
			Where("user_id = ?", mExpectedUserProjectRelationship.UserID).
			Where("project_id = ?", mExpectedUserProjectRelationship.ProjectID).
			First(&UserProjectRelationship{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userProjectRelationshipDBColumns).AddRows(generateUserProjectRelationshipDBRows(mExpectedUserProjectRelationship)...))

		mUserProjectRelationship, err := FirstOrCreateUserProjectRelationship(context.Background(), db, mExpectedUserProjectRelationship.UserID, mExpectedUserProjectRelationship.ProjectID)
		require.NoError(t, err)
		assert.Equal(t, mExpectedUserProjectRelationship, *mUserProjectRelationship)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}
