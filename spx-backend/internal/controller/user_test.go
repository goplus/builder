package controller

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/builder/spx-backend/internal/model/modeltest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func newTestUser() *model.User {
	return &model.User{
		Model:              model.Model{ID: 1},
		Username:           "test-user",
		Description:        "test-description",
		FollowerCount:      10,
		FollowingCount:     5,
		ProjectCount:       3,
		PublicProjectCount: 2,
		LikedProjectCount:  15,
	}
}

func newContextWithTestUser(ctx context.Context) context.Context {
	testUser := newTestUser()
	ctx = authn.NewContextWithUser(ctx, testUser)
	ctx = authz.NewContextWithUserCapabilities(ctx, authz.UserCapabilities{
		CanManageAssets:               false,
		CanUsePremiumLLM:              false,
		CopilotMessageQuota:           100,
		CopilotMessageQuotaLeft:       100,
		AIDescriptionQuota:            300,
		AIDescriptionQuotaLeft:        295,
		AIInteractionTurnQuota:        12000,
		AIInteractionTurnQuotaLeft:    11900,
		AIInteractionArchiveQuota:     8000,
		AIInteractionArchiveQuotaLeft: 7980,
	})
	return ctx
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
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Order("user.created_at asc, user.id").
			Offset(params.Pagination.Offset()).
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
		require.Len(t, result.Data, 2)
		assert.Equal(t, mUsers[0].Username, result.Data[0].Username)
		assert.Equal(t, mUsers[1].Username, result.Data[1].Username)
		assert.Nil(t, result.Data[0].Capabilities)
		assert.Nil(t, result.Data[1].Capabilities)

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
		params.Follower = ptr("follower_user")

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
			Order("user.created_at asc, user.id").
			Offset(params.Pagination.Offset()).
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
		require.Len(t, result.Data, 1)
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
		params.Followee = ptr("followee_user")

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
			Order("user.created_at asc, user.id").
			Offset(params.Pagination.Offset()).
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
		require.Len(t, result.Data, 1)
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
		params.Follower = ptr("follower_user")

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
			Order("follower_relationship.followed_at asc, user.id").
			Offset(params.Pagination.Offset()).
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
		require.Len(t, result.Data, 2)
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
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
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
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true}).
			Order("user.created_at asc, user.id").
			Offset(params.Pagination.Offset()).
			Limit(params.Pagination.Size).
			Find(&[]model.User{}).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
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
			Description:        "Test description",
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

		result, err := ctrl.GetUser(context.Background(), mUser.Username)
		require.NoError(t, err)
		assert.Equal(t, mUser.Username, result.Username)
		assert.Equal(t, mUser.Description, result.Description)
		assert.Equal(t, mUser.FollowerCount, result.FollowerCount)
		assert.Nil(t, result.Capabilities)

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
		assert.EqualError(t, err, fmt.Sprintf("failed to get user %q: record not found", mUserUsername))

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestControllerGetAuthenticatedUser(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		result, err := ctrl.GetAuthenticatedUser(ctx)
		require.NoError(t, err)
		assert.Equal(t, mUser.Username, result.Username)
		assert.Equal(t, mUser.Description, result.Description)
		assert.Equal(t, mUser.FollowerCount, result.FollowerCount)
		assert.Equal(t, mUser.FollowingCount, result.FollowingCount)
		assert.Equal(t, mUser.ProjectCount, result.ProjectCount)
		assert.Equal(t, mUser.PublicProjectCount, result.PublicProjectCount)
		assert.Equal(t, mUser.LikedProjectCount, result.LikedProjectCount)
		assert.NotNil(t, result.Capabilities)
		assert.False(t, result.Capabilities.CanManageAssets)
		assert.False(t, result.Capabilities.CanUsePremiumLLM)
		assert.Equal(t, int64(100), result.Capabilities.CopilotMessageQuota)
		assert.Equal(t, int64(100), result.Capabilities.CopilotMessageQuotaLeft)
		assert.Equal(t, int64(300), result.Capabilities.AIDescriptionQuota)
		assert.Equal(t, int64(295), result.Capabilities.AIDescriptionQuotaLeft)
		assert.Equal(t, int64(12000), result.Capabilities.AIInteractionTurnQuota)
		assert.Equal(t, int64(11900), result.Capabilities.AIInteractionTurnQuotaLeft)
		assert.Equal(t, int64(8000), result.Capabilities.AIInteractionArchiveQuota)
		assert.Equal(t, int64(7980), result.Capabilities.AIInteractionArchiveQuotaLeft)
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		ctx := context.Background()

		_, err := ctrl.GetAuthenticatedUser(ctx)
		require.Error(t, err)
		assert.ErrorIs(t, err, authn.ErrUnauthorized)
	})

	t.Run("MissingCapabilities", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		testUser := newTestUser()
		ctx := authn.NewContextWithUser(context.Background(), testUser)

		_, err := ctrl.GetAuthenticatedUser(ctx)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "missing user capabilities in context")
	})
}

func TestUpdateAuthenticatedUserParams(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		params := &UpdateAuthenticatedUserParams{
			Description: "New description",
		}
		ok, msg := params.Validate()
		assert.True(t, ok)
		assert.Empty(t, msg)
	})
}

func TestControllerUpdateAuthenticatedUser(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		params := &UpdateAuthenticatedUserParams{
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

		result, err := ctrl.UpdateAuthenticatedUser(ctx, params)
		require.NoError(t, err)
		assert.Equal(t, params.Description, result.Description)
		assert.Equal(t, mUser.Username, result.Username)
		assert.NotNil(t, result.Capabilities)
		assert.False(t, result.Capabilities.CanManageAssets)
		assert.False(t, result.Capabilities.CanUsePremiumLLM)
		assert.Equal(t, int64(100), result.Capabilities.CopilotMessageQuota)
		assert.Equal(t, int64(100), result.Capabilities.CopilotMessageQuotaLeft)
		assert.Equal(t, int64(300), result.Capabilities.AIDescriptionQuota)
		assert.Equal(t, int64(295), result.Capabilities.AIDescriptionQuotaLeft)
		assert.Equal(t, int64(12000), result.Capabilities.AIInteractionTurnQuota)
		assert.Equal(t, int64(11900), result.Capabilities.AIInteractionTurnQuotaLeft)
		assert.Equal(t, int64(8000), result.Capabilities.AIInteractionArchiveQuota)
		assert.Equal(t, int64(7980), result.Capabilities.AIInteractionArchiveQuotaLeft)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("NoChanges", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		params := &UpdateAuthenticatedUserParams{
			Description: mUser.Description,
		}

		result, err := ctrl.UpdateAuthenticatedUser(ctx, params)
		require.NoError(t, err)
		assert.Equal(t, mUser.Description, result.Description)
		assert.Equal(t, mUser.Username, result.Username)
		assert.NotNil(t, result.Capabilities)
	})

	t.Run("Unauthorized", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		ctx := context.Background()

		params := &UpdateAuthenticatedUserParams{
			Description: "New description",
		}

		_, err := ctrl.UpdateAuthenticatedUser(ctx, params)
		require.Error(t, err)
		assert.ErrorIs(t, err, authn.ErrUnauthorized)
	})

	t.Run("UpdateError", func(t *testing.T) {
		ctrl, dbMock, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		params := &UpdateAuthenticatedUserParams{
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
			WillReturnError(errors.New("update error"))

		dbMock.ExpectRollback()

		_, err := ctrl.UpdateAuthenticatedUser(ctx, params)
		require.Error(t, err)
		assert.EqualError(t, err, fmt.Sprintf("failed to update authenticated user %q: update error", mUser.Username))

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
		mUser, ok := authn.UserFromContext(ctx)
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
			UpdateColumn("following_count", gorm.Expr("following_count + 1")).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.User{Model: mTargetUser.Model}).
			UpdateColumn("follower_count", gorm.Expr("follower_count + 1")).
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
		mUser, ok := authn.UserFromContext(ctx)
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
		require.ErrorIs(t, err, authn.ErrUnauthorized)
	})

	t.Run("SelfFollow", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
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
		mUser, ok := authn.UserFromContext(ctx)
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
		mUser, ok := authn.UserFromContext(ctx)
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
		require.ErrorIs(t, err, authn.ErrUnauthorized)
	})

	t.Run("SelfCheck", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
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
		mUser, ok := authn.UserFromContext(ctx)
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
			UpdateColumn("following_count", gorm.Expr("following_count - 1")).
			Statement
		dbMockArgs = modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		dbMock.ExpectExec(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnResult(sqlmock.NewResult(0, 1))

		dbMockStmt = ctrl.db.Session(&gorm.Session{DryRun: true, SkipDefaultTransaction: true}).
			Model(&model.User{Model: mTargetUser.Model}).
			UpdateColumn("follower_count", gorm.Expr("follower_count - 1")).
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
		mUser, ok := authn.UserFromContext(ctx)
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
		require.ErrorIs(t, err, authn.ErrUnauthorized)
	})

	t.Run("SelfUnfollow", func(t *testing.T) {
		ctrl, _, closeDB := newTestController(t)
		defer closeDB()

		ctx := newContextWithTestUser(context.Background())
		mUser, ok := authn.UserFromContext(ctx)
		require.True(t, ok)

		err := ctrl.UnfollowUser(ctx, mUser.Username)
		require.ErrorIs(t, err, ErrBadRequest)
	})
}
