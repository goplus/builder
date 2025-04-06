package controller

import (
	"context"
	"encoding/json"
	"regexp"
	"strconv"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/builder/spx-backend/internal/model/modeltest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestControllerEnsureStoryline(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()

	storylineDBColumns, err := modeltest.ExtractDBColumns(db, model.Storyline{})
	require.NoError(t, err)
	generateStorylineDBRows, err := modeltest.NewDBRowsGenerator(db, model.Storyline{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		mStoryline := model.Storyline{
			Model: model.Model{ID: 1},
			Name:  "testName",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("id = ?", mStoryline.ID).
			First(&model.Storyline{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(storylineDBColumns).AddRows(generateStorylineDBRows(mStoryline)...))

		storyline, err := ctrl.ensureStoryline(ctx, mStoryline.ID)
		require.NoError(t, err)

		assert.Equal(t, mStoryline.ID, storyline.ID)
		assert.Equal(t, mStoryline.Name, storyline.Name)
	})

	t.Run("StorylineNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		var mStorylineId int64 = 1
		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("id = ?", mStorylineId).
			First(&model.Storyline{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		_, err := ctrl.ensureStoryline(ctx, mStorylineId)
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestListStorylinesParams(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		params := NewListStorylineParams()
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("InvalidSortOrder", func(t *testing.T) {
		params := NewListStorylineParams()
		params.SortOrder = "invalid"
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid sort order", msg)
	})

	t.Run("InvalidPagination", func(t *testing.T) {
		params := NewListStorylineParams()
		params.Pagination.Index = 0
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid pagination", msg)
	})
}

func TestControllerListStorylines(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	storylineDBColumns, err := modeltest.ExtractDBColumns(db, model.Storyline{})
	require.NoError(t, err)
	generateStorylineDBRows, err := modeltest.NewDBRowsGenerator(db, model.Storyline{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		params := NewListStorylineParams()

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.Storyline{}).
			Count(new(int64)).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Order("created_at asc").
			Offset(params.Pagination.Offset()).
			Limit(params.Pagination.Size).
			Find(&[]model.Storyline{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(storylineDBColumns).AddRows(
				generateStorylineDBRows(
					model.Storyline{Model: model.Model{ID: 1}, Name: "test1"},
					model.Storyline{Model: model.Model{ID: 2}, Name: "test2"},
				)...,
			))

		result, err := ctrl.ListStoryline(ctx, params)
		require.NoError(t, err)
		assert.Equal(t, int64(2), result.Total)
		assert.Len(t, result.Data, 2)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestControllerGetStoryline(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	storylineDBColumns, err := modeltest.ExtractDBColumns(db, model.Storyline{})
	require.NoError(t, err)
	generateStorylineDBRows, err := modeltest.NewDBRowsGenerator(db, model.Storyline{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		mStoryline := model.Storyline{
			Model: model.Model{ID: 1},
			Name:  "testName",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("id = ?", mStoryline.ID).
			First(&model.Storyline{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(storylineDBColumns).AddRows(generateStorylineDBRows(mStoryline)...))

		storyline, err := ctrl.GetStoryline(ctx, "1")
		require.NoError(t, err)
		assert.Equal(t, strconv.FormatInt(mStoryline.ID, 10), storyline.ID)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("StorylineNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		var mStorylineID int64 = 1
		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("id = ?", mStorylineID).
			First(&model.Storyline{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		_, err := ctrl.GetStoryline(ctx, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestControllerStudyStoryline(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	storylineDBColumns, err := modeltest.ExtractDBColumns(db, model.Storyline{})
	require.NoError(t, err)
	generateStorylineDBRows, err := modeltest.NewDBRowsGenerator(db, model.Storyline{})
	require.NoError(t, err)
	userStorylineRelationshipDBColumns, err := modeltest.ExtractDBColumns(db, model.UserStorylineRelationship{})
	require.NoError(t, err)
	generateUserStorylineRelationshipDBRows, err := modeltest.NewDBRowsGenerator(db, model.UserStorylineRelationship{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		mStoryline := model.Storyline{
			Model: model.Model{ID: 1},
			Name:  "testName",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("id = ?", mStoryline.ID).
			First(&model.Storyline{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(storylineDBColumns).AddRows(generateStorylineDBRows(mStoryline)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("user_id = ? AND storyline_id = ?", mAuthedUser.ID, mStoryline.ID).
			First(&model.UserStorylineRelationship{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userStorylineRelationshipDBColumns))

		dbMock.ExpectBegin()
		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Create(&model.UserStorylineRelationship{
				UserID:      mAuthedUser.ID,
				StorylineID: mStoryline.ID,
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg() // CreatedAt
		dbMockArgs[1] = sqlmock.AnyArg() // UpdatedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(1, 1))
		dbMock.ExpectCommit()

		result, err := ctrl.StudyStoryline(ctx, "1")
		require.NoError(t, err)
		assert.Equal(t, result.StorylineID, mStoryline.ID)
		assert.Equal(t, result.LastFinishedLevelIndex, int8(0))

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("AlreadyStudy", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		mStoryline := model.Storyline{
			Model: model.Model{ID: 1},
			Name:  "testName",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("id = ?", mStoryline.ID).
			First(&model.Storyline{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(storylineDBColumns).AddRows(generateStorylineDBRows(mStoryline)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("user_id = ? AND storyline_id = ?", mAuthedUser.ID, mStoryline.ID).
			First(&model.UserStorylineRelationship{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userStorylineRelationshipDBColumns).AddRows(generateUserStorylineRelationshipDBRows(model.UserStorylineRelationship{
				Model:       model.Model{ID: 1},
				UserID:      mAuthedUser.ID,
				StorylineID: mStoryline.ID,
			})...))

		_, err := ctrl.StudyStoryline(ctx, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrBadRequest)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("StorylineNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		var mStorylineId = 1

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("id = ?", mStorylineId).
			First(&model.Storyline{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		_, err := ctrl.StudyStoryline(ctx, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestControllerGetStorylineStudy(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userStorylineRelationshipDBColumns, err := modeltest.ExtractDBColumns(db, model.UserStorylineRelationship{})
	require.NoError(t, err)
	generateUserStorylineRelationshipDBRows, err := modeltest.NewDBRowsGenerator(db, model.UserStorylineRelationship{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		mUserStorylineRelationship := model.UserStorylineRelationship{
			StorylineID:            1,
			UserID:                 mAuthedUser.ID,
			LastFinishedLevelIndex: 1,
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("user_id = ? AND storyline_id = ?", mAuthedUser.ID, mUserStorylineRelationship.StorylineID).
			First(&model.UserStorylineRelationship{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userStorylineRelationshipDBColumns).AddRows(generateUserStorylineRelationshipDBRows(mUserStorylineRelationship)...))

		result, err := ctrl.GetStoryLineStudy(ctx, "1")
		require.NoError(t, err)
		assert.Equal(t, result.LastFinishedLevelIndex, mUserStorylineRelationship.LastFinishedLevelIndex)
		assert.Equal(t, result.StorylineID, mUserStorylineRelationship.StorylineID)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("NotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		var mStorylineId = 1

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("user_id = ? AND storyline_id = ?", mAuthedUser.ID, mStorylineId).
			First(&model.UserStorylineRelationship{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		_, err := ctrl.GetStoryLineStudy(ctx, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestFinishStorylineLevelParams(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		params := &UpdateUserStorylineRelationshipParam{
			LastFinishedLevelIndex: 1,
		}

		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("InValid", func(t *testing.T) {
		params := &UpdateUserStorylineRelationshipParam{
			LastFinishedLevelIndex: -1,
		}

		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid lastFinishedLevelIndex", msg)
	})
}

func TestControllerFinishStorylineLevel(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userStorylineRelationshipDBColumns, err := modeltest.ExtractDBColumns(db, model.UserStorylineRelationship{})
	require.NoError(t, err)
	generateUserStorylineRelationshipDBRows, err := modeltest.NewDBRowsGenerator(db, model.UserStorylineRelationship{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		mUserStorylineRelationship := model.UserStorylineRelationship{
			Model:                  model.Model{ID: 1},
			StorylineID:            1,
			UserID:                 mAuthedUser.ID,
			LastFinishedLevelIndex: 1,
		}

		params := &UpdateUserStorylineRelationshipParam{
			LastFinishedLevelIndex: 2,
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("user_id = ? AND storyline_id = ?", mAuthedUser.ID, mUserStorylineRelationship.StorylineID).
			First(&model.UserStorylineRelationship{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userStorylineRelationshipDBColumns).AddRows(generateUserStorylineRelationshipDBRows(mUserStorylineRelationship)...))

		dbMock.ExpectBegin()

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.UserStorylineRelationship{Model: mUserStorylineRelationship.Model}).
			Updates(map[string]any{
				"last_finished_level_index": params.LastFinishedLevelIndex,
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[1] = sqlmock.AnyArg() // UpdatedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMock.ExpectCommit()

		result, err := ctrl.FinishStorylineLevel(ctx, "1", params)
		require.NoError(t, err)
		assert.Equal(t, params.LastFinishedLevelIndex, result.LastFinishedLevelIndex)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("NotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		params := &UpdateUserStorylineRelationshipParam{
			LastFinishedLevelIndex: 2,
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("user_id = ? AND storyline_id = ?", mAuthedUser.ID, 1).
			First(&model.UserStorylineRelationship{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		_, err := ctrl.FinishStorylineLevel(ctx, "1", params)
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("InvalidIndex", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		mUserStorylineRelationship := model.UserStorylineRelationship{
			Model:       model.Model{ID: 1},
			StorylineID: 1,
		}

		params := &UpdateUserStorylineRelationshipParam{
			LastFinishedLevelIndex: 3,
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("user_id = ? AND storyline_id = ?", mAuthedUser.ID, mUserStorylineRelationship.StorylineID).
			First(&model.UserStorylineRelationship{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(ErrBadRequest)

		_, err := ctrl.FinishStorylineLevel(ctx, "1", params)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrBadRequest)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestCheckCodeParams(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		params := &CheckCodeParams{
			UserCode:     "c := 20",
			ExpectedCode: "a := 20",
			Context:      "",
		}

		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("InValidUserCode", func(t *testing.T) {
		params := &CheckCodeParams{
			UserCode:     "",
			ExpectedCode: "a := 20",
			Context:      "",
		}

		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, msg, "invalid user code")
	})

	t.Run("InValidExpectedCode", func(t *testing.T) {
		params := &CheckCodeParams{
			UserCode:     "c := 20",
			ExpectedCode: "",
			Context:      "",
		}

		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, msg, "invalid expected code")
	})

	t.Run("User code too long", func(t *testing.T) {
		params := &CheckCodeParams{
			UserCode:     "c" + string(make([]byte, 10000)),
			ExpectedCode: "a := 20",
			Context:      "",
		}

		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, msg, "user code too long")
	})

	t.Run("Expected code too long", func(t *testing.T) {
		params := &CheckCodeParams{
			UserCode:     "c := 20",
			ExpectedCode: "a" + string(make([]byte, 10000)),
			Context:      "",
		}

		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, msg, "expected code too long")
	})

	t.Run("Context too long", func(t *testing.T) {
		params := &CheckCodeParams{
			UserCode:     "c := 20",
			ExpectedCode: "a := 20",
			Context:      "c" + string(make([]byte, 10000)),
		}

		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, msg, "context too long")
	})
}

func TestCreateStorylineParams(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		params := &CreateStorylineParams{
			BackgroundImage: "test.jpg",
			Name:            "testName",
			Title: LocaleMessage{
				En: "111",
				Zh: "222",
			},
			Description: LocaleMessage{
				En: "111",
				Zh: "222",
			},
			Tag:    "easy",
			Levels: "123",
		}

		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("InvalidBackgroundImage", func(t *testing.T) {
		params := &CreateStorylineParams{
			BackgroundImage: "",
			Name:            "testName",
			Title: LocaleMessage{
				En: "111",
				Zh: "222",
			},
			Description: LocaleMessage{
				En: "111",
				Zh: "222",
			},
			Tag:    "easy",
			Levels: "123",
		}

		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, msg, "invalid background image")
	})

	t.Run("InvalidName", func(t *testing.T) {
		params := &CreateStorylineParams{
			BackgroundImage: "test.jpg",
			Name:            "",
			Title: LocaleMessage{
				En: "111",
				Zh: "222",
			},
			Description: LocaleMessage{
				En: "111",
				Zh: "222",
			},
			Tag:    "easy",
			Levels: "123",
		}

		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, msg, "invalid name")
	})

	t.Run("InvalidTitle", func(t *testing.T) {
		params := &CreateStorylineParams{
			BackgroundImage: "test.jpg",
			Name:            "testName",
			Title: LocaleMessage{
				En: "",
				Zh: "222",
			},
			Description: LocaleMessage{
				En: "111",
				Zh: "222",
			},
			Tag:    "easy",
			Levels: "123",
		}

		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, msg, "invalid title")
	})

	t.Run("InvalidTag", func(t *testing.T) {
		params := &CreateStorylineParams{
			BackgroundImage: "test.jpg",
			Name:            "testName",
			Title: LocaleMessage{
				En: "111",
				Zh: "222",
			},
			Description: LocaleMessage{
				En: "111",
				Zh: "222",
			},
			Tag:    "",
			Levels: "123",
		}

		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, msg, "invalid tag")
	})

	t.Run("InvalidDescription", func(t *testing.T) {
		params := &CreateStorylineParams{
			BackgroundImage: "test.jpg",
			Name:            "testName",
			Title: LocaleMessage{
				En: "111",
				Zh: "222",
			},
			Description: LocaleMessage{
				En: "",
				Zh: "222",
			},
			Tag:    "easy",
			Levels: "123",
		}

		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, msg, "invalid description")
	})

	t.Run("InvalidLevels", func(t *testing.T) {
		params := &CreateStorylineParams{
			BackgroundImage: "test.jpg",
			Name:            "testName",
			Title: LocaleMessage{
				En: "111",
				Zh: "222",
			},
			Description: LocaleMessage{
				En: "111",
				Zh: "222",
			},
			Tag:    "easy",
			Levels: "",
		}

		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, msg, "invalid levels")
	})
}

func TestControllerCreateStoryline(t *testing.T) {
	//db, _, closeDB, err := modeltest.NewMockDB()
	//require.NoError(t, err)
	//closeDB()
	//userDBColumns, err := modeltest.ExtractDBColumns(db, model.Storyline{})
	//require.NoError(t, err)
	//generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.Storyline{})
	//require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		params := &CreateStorylineParams{
			BackgroundImage: "test.jpg",
			Name:            "testName",
			Title: LocaleMessage{
				En: "111",
				Zh: "222",
			},
			Description: LocaleMessage{
				En: "111",
				Zh: "222",
			},
			Tag:    "easy",
			Levels: "123",
		}

		title, err := json.Marshal(params.Title)

		description, err := json.Marshal(params.Description)

		dbMock.ExpectBegin()

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Create(&model.Storyline{
				OwnerID:         mAuthedUser.ID,
				BackgroundImage: params.BackgroundImage,
				Name:            params.Name,
				Title:           string(title),
				Description:     string(description),
				Tag:             model.ParseStorylineTag(params.Tag),
				Levels:          params.Levels,
			}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg() // CreatedAt
		dbMockArgs[1] = sqlmock.AnyArg() // UpdatedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(1, 1))

		dbMock.ExpectCommit()

		result, err := ctrl.CreateStoryline(ctx, params)
		require.NoError(t, err)
		assert.Equal(t, params.BackgroundImage, result.BackgroundImage)
		assert.Equal(t, params.Name, result.Name)
		assert.Equal(t, params.Title, result.Title)
		assert.Equal(t, params.Description, result.Description)
		assert.Equal(t, params.Tag, result.Tag)
		assert.Equal(t, params.Levels, result.Levels)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		params := &CreateStorylineParams{
			BackgroundImage: "test.jpg",
			Name:            "testName",
			Title: LocaleMessage{
				En: "111",
				Zh: "222",
			},
			Description: LocaleMessage{
				En: "111",
				Zh: "222",
			},
			Tag:    "easy",
			Levels: "123",
		}

		_, err := ctrl.CreateStoryline(context.Background(), params)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnauthorized)
	})
}

func TestControllerUpdateStoryline(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	storylineDBColumns, err := modeltest.ExtractDBColumns(db, model.Storyline{})
	require.NoError(t, err)
	generateStorylineDBRows, err := modeltest.NewDBRowsGenerator(db, model.Storyline{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		mStoryline := model.Storyline{
			Model:       model.Model{ID: 1},
			OwnerID:     mAuthedUser.ID,
			Name:        "testName1",
			Title:       "{\"en\":\"111\",\"zh\":\"111\"}",
			Description: "{\"en\":\"111\",\"zh\":\"111\"}",
			Tag:         1,
			Levels:      "123",
		}

		params := &UpdateStorylineParams{
			BackgroundImage: "test.jpg",
			Name:            "testName",
			Title: LocaleMessage{
				En: "222",
				Zh: "222",
			},
			Description: LocaleMessage{
				En: "222",
				Zh: "222",
			},
			Tag:    "easy",
			Levels: "222",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("id = ?", 1).
			First(&model.Storyline{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(storylineDBColumns).AddRows(generateStorylineDBRows(mStoryline)...))

		dbMock.ExpectBegin()

		title, err := json.Marshal(params.Title)
		require.NoError(t, err)

		description, err := json.Marshal(params.Description)
		require.NoError(t, err)

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.Storyline{Model: mStoryline.Model}).
			Updates(map[string]any{
				"background_image": params.BackgroundImage,
				"name":             params.Name,
				"title":            string(title),
				"description":      string(description),
				"tag":              model.ParseStorylineTag(params.Tag),
				"levels":           params.Levels,
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[6] = sqlmock.AnyArg() // UpdatedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMock.ExpectCommit()

		result, err := ctrl.UpdateStoryline(ctx, "1", params)
		require.NoError(t, err)
		assert.Equal(t, params.BackgroundImage, result.BackgroundImage)
		assert.Equal(t, params.Name, result.Name)
		assert.Equal(t, params.Title, result.Title)
		assert.Equal(t, params.Description, result.Description)
		assert.Equal(t, params.Tag, result.Tag)
		assert.Equal(t, params.Levels, result.Levels)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("StorylineNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		_, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		storylineId := 1

		params := &UpdateStorylineParams{
			BackgroundImage: "test.jpg",
			Name:            "testName",
			Title: LocaleMessage{
				En: "222",
				Zh: "222",
			},
			Description: LocaleMessage{
				En: "222",
				Zh: "222",
			},
			Tag:    "easy",
			Levels: "222",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("id = ?", storylineId).
			First(&model.Storyline{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		_, err := ctrl.UpdateStoryline(ctx, "1", params)
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		params := &UpdateStorylineParams{
			BackgroundImage: "test.jpg",
			Name:            "testName",
			Title: LocaleMessage{
				En: "222",
				Zh: "222",
			},
			Description: LocaleMessage{
				En: "222",
				Zh: "222",
			},
			Tag:    "easy",
			Levels: "222",
		}

		_, err := ctrl.UpdateStoryline(context.Background(), "1", params)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnauthorized)
	})
}

func TestControllerDeleteStoryline(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	storylineDBColumns, err := modeltest.ExtractDBColumns(db, model.Storyline{})
	require.NoError(t, err)
	generateStorylineDBRows, err := modeltest.NewDBRowsGenerator(db, model.Storyline{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
		require.True(t, isAuthed)

		mStoryline := model.Storyline{
			Model:   model.Model{ID: 1},
			OwnerID: mAuthedUser.ID,
		}
		dbMock.ExpectBegin()

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("id = ?", 1).
			First(&model.Storyline{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)

		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(storylineDBColumns).AddRows(generateStorylineDBRows(mStoryline)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Where("storyline_id = ?", mStoryline.ID).
			Delete(&model.UserStorylineRelationship{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg()
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 0))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Delete(&model.Storyline{Model: mStoryline.Model}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg()
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMock.ExpectCommit()

		err := ctrl.DeleteStoryline(ctx, "1")
		require.NoError(t, err)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("StorylineNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())

		storylineId := 1

		dbMock.ExpectBegin()

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("id = ?", storylineId).
			First(&model.Storyline{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		dbMock.ExpectRollback()

		err := ctrl.DeleteStoryline(ctx, "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, gorm.ErrRecordNotFound)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		err := ctrl.DeleteStoryline(context.Background(), "1")
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnauthorized)
	})
}
