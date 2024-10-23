package controller

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/builder/spx-backend/internal/model/modeltest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func newTestUser() *model.User {
	return &model.User{
		Model:              model.Model{ID: 1},
		Username:           "fake-name",
		Description:        "fake-description",
		FollowerCount:      10,
		FollowingCount:     5,
		ProjectCount:       3,
		PublicProjectCount: 2,
		LikedProjectCount:  15,
	}
}

func newContextWithTestUser(ctx context.Context) context.Context {
	return NewContextWithUser(ctx, newTestUser())
}

func TestNewContextWithUser(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		mExpectedUser := newTestUser()
		ctx := NewContextWithUser(context.Background(), mExpectedUser)

		mUser, ok := ctx.Value(userContextKey).(*model.User)
		require.True(t, ok)
		require.NotNil(t, mUser)
		assert.Equal(t, *mExpectedUser, *mUser)
	})
}

func TestUserFromContext(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		mExpectedUser := newTestUser()
		ctx := newContextWithTestUser(context.Background())

		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)
		require.NotNil(t, mUser)
		assert.Equal(t, *mExpectedUser, *mUser)
	})

	t.Run("NoUser", func(t *testing.T) {
		mUser, ok := UserFromContext(context.Background())
		require.False(t, ok)
		require.Nil(t, mUser)
	})
}

func TestEnsureUser(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		mExpectedUser := newTestUser()
		ctx := NewContextWithUser(context.Background(), mExpectedUser)

		mUser, err := ensureUser(ctx, 1)
		require.NoError(t, err)
		assert.Equal(t, *mExpectedUser, *mUser)
	})

	t.Run("ErrUnauthorized", func(t *testing.T) {
		_, err := ensureUser(context.Background(), 1)
		assert.ErrorIs(t, err, ErrUnauthorized)
	})

	t.Run("ErrForbidden", func(t *testing.T) {
		mExpectedUser := newTestUser()
		ctx := NewContextWithUser(context.Background(), mExpectedUser)

		_, err := ensureUser(ctx, 65535)
		assert.ErrorIs(t, err, ErrForbidden)
	})
}

func TestControllerUserFromToken(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		userDBColumns, err := modeltest.ExtractDBColumns(ctrl.db, model.User{})
		require.NoError(t, err)
		generateUserDBRows, err := modeltest.NewDBRowsGenerator(ctrl.db, model.User{})
		require.NoError(t, err)

		mExpectedUser := model.User{
			Model:              model.Model{ID: 1},
			Username:           "fake-name",
			Description:        "Test user description",
			FollowerCount:      10,
			FollowingCount:     5,
			ProjectCount:       3,
			PublicProjectCount: 2,
			LikedProjectCount:  15,
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("username = ?", mExpectedUser.Username).
			First(&model.User{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(mExpectedUser)...))

		mUser, err := ctrl.UserFromToken(context.Background(), fakeUserToken)
		require.NoError(t, err)
		require.NotNil(t, mUser)
		assert.Equal(t, mExpectedUser, *mUser)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("InvalidToken", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		_, err := ctrl.UserFromToken(context.Background(), "invalid-token")
		require.Error(t, err)
		assert.EqualError(t, err, "ctrl.casdoorClient.ParseJwtToken failed: unauthorized: token contains an invalid number of segments")
	})
}

func TestListUsersOrderBy(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		assert.True(t, ListUsersOrderByCreatedAt.IsValid())
		assert.True(t, ListUsersOrderByUpdatedAt.IsValid())
		assert.True(t, ListUsersOrderByFollowedAt.IsValid())
	})

	t.Run("Invalid", func(t *testing.T) {
		assert.False(t, ListUsersOrderBy("invalid").IsValid())
	})
}

func TestListUsersParams(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		params := NewListUsersParams()
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})

	t.Run("InvalidOrderBy", func(t *testing.T) {
		params := NewListUsersParams()
		params.OrderBy = ""
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid orderBy", msg)
	})

	t.Run("InvalidSortOrder", func(t *testing.T) {
		params := NewListUsersParams()
		params.SortOrder = ""
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid sortOrder", msg)
	})

	t.Run("InvalidPagination", func(t *testing.T) {
		params := NewListUsersParams()
		params.Pagination.Index = 0
		ok, msg := params.Validate()
		assert.False(t, ok)
		assert.Equal(t, "invalid pagination", msg)
	})
}

func TestControllerListUsers(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		mUsers := []model.User{
			{
				Model:              model.Model{ID: 1},
				Username:           "user1",
				Description:        "desc1",
				FollowerCount:      10,
				FollowingCount:     5,
				ProjectCount:       3,
				PublicProjectCount: 2,
				LikedProjectCount:  15,
			},
			{
				Model:              model.Model{ID: 2},
				Username:           "user2",
				Description:        "desc2",
				FollowerCount:      20,
				FollowingCount:     15,
				ProjectCount:       5,
				PublicProjectCount: 4,
				LikedProjectCount:  25,
			},
		}

		params := NewListUsersParams()
		params.Pagination.Size = 2

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.User{}).
			Count(new(int64)).
			Statement
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Order("user.created_at desc, user.id").
			Limit(2).
			Find(&[]model.User{}).
			Statement
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(mUsers...)...))

		result, err := ctrl.ListUsers(context.Background(), params)
		require.NoError(t, err)
		assert.Equal(t, int64(2), result.Total)
		assert.Len(t, result.Data, 2)
		assert.Equal(t, mUsers[0].Username, result.Data[0].Username)
		assert.Equal(t, mUsers[1].Username, result.Data[1].Username)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("WithFollower", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		mUsers := []model.User{
			{
				Model:         model.Model{ID: 1},
				Username:      "followee_user",
				Description:   "desc",
				FollowerCount: 1,
			},
		}

		params := NewListUsersParams()
		params.Follower = stringPtr("follower_user")

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.User{}).
			Joins("JOIN user AS follower ON follower.username = ?", *params.Follower).
			Joins("JOIN user_relationship AS follower_relationship ON follower_relationship.user_id = follower.id AND follower_relationship.target_user_id = user.id").
			Where("follower_relationship.followed_at IS NOT NULL").
			Count(new(int64)).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user AS follower ON follower.username = ?", *params.Follower).
			Joins("JOIN user_relationship AS follower_relationship ON follower_relationship.user_id = follower.id AND follower_relationship.target_user_id = user.id").
			Where("follower_relationship.followed_at IS NOT NULL").
			Order("user.created_at desc, user.id").
			Limit(params.Pagination.Size).
			Find(&[]model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(mUsers...)...))

		result, err := ctrl.ListUsers(context.Background(), params)
		require.NoError(t, err)
		assert.Equal(t, int64(1), result.Total)
		assert.Len(t, result.Data, 1)
		assert.Equal(t, mUsers[0].Username, result.Data[0].Username)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("WithFollowee", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		mUsers := []model.User{
			{
				Model:          model.Model{ID: 1},
				Username:       "follower_user",
				Description:    "desc",
				FollowingCount: 1,
			},
		}

		params := NewListUsersParams()
		params.Followee = stringPtr("followee_user")

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.User{}).
			Joins("JOIN user AS followee ON followee.username = ?", *params.Followee).
			Joins("JOIN user_relationship AS followee_relationship ON followee_relationship.target_user_id = followee.id AND followee_relationship.user_id = user.id").
			Where("followee_relationship.followed_at IS NOT NULL").
			Count(new(int64)).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user AS followee ON followee.username = ?", *params.Followee).
			Joins("JOIN user_relationship AS followee_relationship ON followee_relationship.target_user_id = followee.id AND followee_relationship.user_id = user.id").
			Where("followee_relationship.followed_at IS NOT NULL").
			Order("user.created_at desc, user.id").
			Limit(params.Pagination.Size).
			Find(&[]model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(mUsers...)...))

		result, err := ctrl.ListUsers(context.Background(), params)
		require.NoError(t, err)
		assert.Equal(t, int64(1), result.Total)
		assert.Len(t, result.Data, 1)
		assert.Equal(t, mUsers[0].Username, result.Data[0].Username)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("OrderByFollowedAt", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		mUsers := []model.User{
			{
				Model:       model.Model{ID: 1},
				Username:    "user1",
				Description: "desc1",
			},
			{
				Model:       model.Model{ID: 2},
				Username:    "user2",
				Description: "desc2",
			},
		}

		params := NewListUsersParams()
		params.OrderBy = ListUsersOrderByFollowedAt
		params.Follower = stringPtr("follower_user")

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.User{}).
			Joins("JOIN user AS follower ON follower.username = ?", *params.Follower).
			Joins("JOIN user_relationship AS follower_relationship ON follower_relationship.user_id = follower.id AND follower_relationship.target_user_id = user.id").
			Where("follower_relationship.followed_at IS NOT NULL").
			Count(new(int64)).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Joins("JOIN user AS follower ON follower.username = ?", *params.Follower).
			Joins("JOIN user_relationship AS follower_relationship ON follower_relationship.user_id = follower.id AND follower_relationship.target_user_id = user.id").
			Where("follower_relationship.followed_at IS NOT NULL").
			Order("follower_relationship.followed_at desc, user.id").
			Limit(params.Pagination.Size).
			Find(&[]model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(mUsers...)...))

		result, err := ctrl.ListUsers(context.Background(), params)
		require.NoError(t, err)
		assert.Equal(t, int64(2), result.Total)
		assert.Len(t, result.Data, 2)
		assert.Equal(t, mUsers[0].Username, result.Data[0].Username)
		assert.Equal(t, mUsers[1].Username, result.Data[1].Username)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("ErrorInCount", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		params := NewListUsersParams()

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.User{}).
			Count(new(int64)).
			Statement
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnError(errors.New("count error"))

		_, err := ctrl.ListUsers(context.Background(), params)
		require.Error(t, err)
		assert.EqualError(t, err, "failed to count users: count error")

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("ErrorInQuery", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		params := NewListUsersParams()

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Model(&model.User{}).
			Count(new(int64)).
			Statement
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Order("user.created_at desc").
			Find(&[]model.User{}).
			Statement
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnError(errors.New("query error"))

		_, err := ctrl.ListUsers(context.Background(), params)
		require.Error(t, err)
		assert.EqualError(t, err, "failed to list users: query error")

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestControllerGetUser(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		mUser := model.User{
			Model:              model.Model{ID: 1},
			Username:           "testuser",
			DisplayName:        "Tester",
			Avatar:             "https://example.com/avatar.jpg",
			Description:        "Test user description",
			FollowerCount:      10,
			FollowingCount:     5,
			ProjectCount:       3,
			PublicProjectCount: 2,
			LikedProjectCount:  15,
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("username = ?", mUser.Username).
			First(&model.User{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(mUser)...))

		dbMock.ExpectBegin()

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.User{Model: mUser.Model}).
			Updates(map[string]any{
				"display_name": "",
				"avatar":       "",
				"updated_at":   sqlmock.AnyArg(),
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(1, 1))

		dbMock.ExpectCommit()

		result, err := ctrl.GetUser(context.Background(), mUser.Username)
		require.NoError(t, err)
		assert.Equal(t, mUser.Username, result.Username)
		assert.Equal(t, mUser.Description, result.Description)
		assert.Equal(t, mUser.FollowerCount, result.FollowerCount)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("UserNotFound", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		mUserUsername := "nonexistentuser"

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("username = ?", mUserUsername).
			First(&model.User{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		_, err := ctrl.GetUser(context.Background(), mUserUsername)
		require.Error(t, err)
		assert.EqualError(t, err, fmt.Sprintf("failed to get user %s: record not found", mUserUsername))

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestUpdateAuthedUserParams(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		params := &UpdateAuthedUserParams{
			Description: "New description",
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})
}

func TestControllerUpdateAuthedUser(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		params := &UpdateAuthedUserParams{
			Description: "New description",
		}

		dbMock.ExpectBegin()

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.User{Model: mUser.Model}).
			Updates(map[string]any{
				"description": params.Description,
				"updated_at":  sqlmock.AnyArg(),
			}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(1, 1))

		dbMock.ExpectCommit()

		result, err := ctrl.UpdateAuthedUser(ctx, params)
		require.NoError(t, err)
		assert.Equal(t, params.Description, result.Description)
		assert.Equal(t, mUser.Username, result.Username)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("NoChanges", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		params := &UpdateAuthedUserParams{
			Description: mUser.Description,
		}

		result, err := ctrl.UpdateAuthedUser(ctx, params)
		require.NoError(t, err)
		assert.Equal(t, mUser.Description, result.Description)
		assert.Equal(t, mUser.Username, result.Username)
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		ctx := context.Background()

		params := &UpdateAuthedUserParams{
			Description: "New description",
		}

		_, err := ctrl.UpdateAuthedUser(ctx, params)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnauthorized)
	})

	t.Run("UpdateError", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		params := &UpdateAuthedUserParams{
			Description: "New description",
		}

		dbMock.ExpectBegin()

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.User{Model: mUser.Model}).
			Updates(map[string]any{"description": params.Description}).
			Statement
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WillReturnError(errors.New("update error"))

		dbMock.ExpectRollback()

		_, err := ctrl.UpdateAuthedUser(ctx, params)
		require.Error(t, err)
		assert.EqualError(t, err, fmt.Sprintf("failed to update authenticated user %s: update error", mUser.Username))

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestControllerFollowUser(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	userRelationshipDBColumns, err := modeltest.ExtractDBColumns(db, model.UserRelationship{})
	require.NoError(t, err)
	generateUserRelationshipDBRows, err := modeltest.NewDBRowsGenerator(db, model.UserRelationship{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mTargetUser := model.User{
			Model:    model.Model{ID: 2},
			Username: "target-user",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("username = ?", mTargetUser.Username).
			First(&model.User{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(mTargetUser)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("user_id = ?", mUser.ID).
			Where("target_user_id = ?", mTargetUser.ID).
			First(&model.UserRelationship{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userRelationshipDBColumns))

		dbMock.ExpectBegin()

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Create(&model.UserRelationship{UserID: 1, TargetUserID: 2}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMockArgs[0] = sqlmock.AnyArg() // CreatedAt
		dbMockArgs[1] = sqlmock.AnyArg() // UpdatedAt
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(1, 1))

		dbMock.ExpectCommit()

		dbMock.ExpectBegin()

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.UserRelationship{Model: model.Model{ID: 1}}).
			Where("followed_at IS NULL").
			Updates(map[string]any{
				"followed_at": sqlmock.AnyArg(),
				"updated_at":  sqlmock.AnyArg(),
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.User{Model: mUser.Model}).
			Updates(map[string]any{
				"following_count": gorm.Expr("following_count + 1"),
				"updated_at":      sqlmock.AnyArg(),
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.User{Model: mTargetUser.Model}).
			Updates(map[string]any{
				"follower_count": gorm.Expr("follower_count + 1"),
				"updated_at":     sqlmock.AnyArg(),
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMock.ExpectCommit()

		err := ctrl.FollowUser(ctx, mTargetUser.Username)
		require.NoError(t, err)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("AlreadyFollowing", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mTargetUser := model.User{
			Model:    model.Model{ID: 2},
			Username: "target-user",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("username = ?", mTargetUser.Username).
			First(&model.User{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(mTargetUser)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("user_id = ?", mUser.ID).
			Where("target_user_id = ?", mTargetUser.ID).
			First(&model.UserRelationship{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userRelationshipDBColumns).AddRows(generateUserRelationshipDBRows(
				model.UserRelationship{
					Model:        model.Model{ID: 1},
					UserID:       mUser.ID,
					TargetUserID: mTargetUser.ID,
					FollowedAt:   sql.NullTime{Valid: true},
				},
			)...))

		err := ctrl.FollowUser(ctx, mTargetUser.Username)
		require.NoError(t, err)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		err := ctrl.FollowUser(context.Background(), "target-user")
		require.ErrorIs(t, err, ErrUnauthorized)
	})

	t.Run("SelfFollow", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		err := ctrl.FollowUser(ctx, mUser.Username)
		require.ErrorIs(t, err, ErrBadRequest)
	})
}

func TestControllerIsFollowingUser(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)

	t.Run("Following", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mTargetUser := model.User{
			Model:    model.Model{ID: 2},
			Username: "target-user",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("username = ?", mTargetUser.Username).
			First(&model.User{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(mTargetUser)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Select("id").
			Where("user_id = ?", mUser.ID).
			Where("target_user_id = ?", mTargetUser.ID).
			Where("followed_at IS NOT NULL").
			First(&model.UserRelationship{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))

		isFollowing, err := ctrl.IsFollowingUser(ctx, mTargetUser.Username)
		require.NoError(t, err)
		assert.True(t, isFollowing)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("NotFollowing", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mTargetUser := model.User{
			Model:    model.Model{ID: 2},
			Username: "target-user",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("username = ?", mTargetUser.Username).
			First(&model.User{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(mTargetUser)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Select("id").
			Where("user_id = ?", mUser.ID).
			Where("target_user_id = ?", mTargetUser.ID).
			Where("followed_at IS NOT NULL").
			First(&model.UserRelationship{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(gorm.ErrRecordNotFound)

		isFollowing, err := ctrl.IsFollowingUser(ctx, mTargetUser.Username)
		require.NoError(t, err)
		assert.False(t, isFollowing)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		_, err := ctrl.IsFollowingUser(context.Background(), "target-user")
		require.ErrorIs(t, err, ErrUnauthorized)
	})

	t.Run("SelfCheck", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		_, err := ctrl.IsFollowingUser(ctx, mUser.Username)
		require.ErrorIs(t, err, ErrBadRequest)
	})
}

func TestControllerUnfollowUser(t *testing.T) {
	db, _, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)
	closeDB()
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)
	userRelationshipDBColumns, err := modeltest.ExtractDBColumns(db, model.UserRelationship{})
	require.NoError(t, err)
	generateUserRelationshipDBRows, err := modeltest.NewDBRowsGenerator(db, model.UserRelationship{})
	require.NoError(t, err)

	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mTargetUser := model.User{
			Model:    model.Model{ID: 2},
			Username: "target-user",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("username = ?", mTargetUser.Username).
			First(&model.User{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(mTargetUser)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("user_id = ?", mUser.ID).
			Where("target_user_id = ?", mTargetUser.ID).
			First(&model.UserRelationship{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userRelationshipDBColumns).AddRows(generateUserRelationshipDBRows(
				model.UserRelationship{
					Model:        model.Model{ID: 1},
					UserID:       mUser.ID,
					TargetUserID: mTargetUser.ID,
					FollowedAt:   sql.NullTime{Valid: true, Time: sql.NullTime{}.Time},
				},
			)...))

		dbMock.ExpectBegin()

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.UserRelationship{Model: model.Model{ID: 1}}).
			Where("followed_at = ?", sqlmock.AnyArg()).
			Updates(map[string]any{
				"followed_at": sql.NullTime{},
				"updated_at":  sqlmock.AnyArg(),
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.User{Model: mUser.Model}).
			Updates(map[string]any{
				"following_count": gorm.Expr("following_count - 1"),
				"updated_at":      sqlmock.AnyArg(),
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.User{Model: mTargetUser.Model}).
			Updates(map[string]any{
				"follower_count": gorm.Expr("follower_count - 1"),
				"updated_at":     sqlmock.AnyArg(),
			}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMock.ExpectCommit()

		err := ctrl.UnfollowUser(ctx, mTargetUser.Username)
		require.NoError(t, err)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("AlreadyNotFollowing", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		mTargetUser := model.User{
			Model:    model.Model{ID: 2},
			Username: "target-user",
		}

		dbMockStmt := ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("username = ?", mTargetUser.Username).
			First(&model.User{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(mTargetUser)...))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Where("user_id = ?", mUser.ID).
			Where("target_user_id = ?", mTargetUser.ID).
			First(&model.UserRelationship{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows(userRelationshipDBColumns).AddRows(generateUserRelationshipDBRows(
				model.UserRelationship{
					Model:        model.Model{ID: 1},
					UserID:       mUser.ID,
					TargetUserID: mTargetUser.ID,
					FollowedAt:   sql.NullTime{Valid: false},
				},
			)...))

		err := ctrl.UnfollowUser(ctx, mTargetUser.Username)
		require.NoError(t, err)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		err := ctrl.UnfollowUser(context.Background(), "target-user")
		require.ErrorIs(t, err, ErrUnauthorized)
	})

	t.Run("SelfUnfollow", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := UserFromContext(ctx)
		require.True(t, ok)

		err := ctrl.UnfollowUser(ctx, mUser.Username)
		require.ErrorIs(t, err, ErrBadRequest)
	})
}
