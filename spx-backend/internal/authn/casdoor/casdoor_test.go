package casdoor

import (
	"context"
	"database/sql/driver"
	"errors"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/casdoor/casdoor-go-sdk/casdoorsdk"
	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/builder/spx-backend/internal/model/modeltest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

type mockClient struct {
	parseJwtTokenFunc func(token string) (*casdoorsdk.Claims, error)
	getUserFunc       func(name string) (*casdoorsdk.User, error)
}

func newMockClient() *mockClient {
	return &mockClient{}
}

func (mc *mockClient) ParseJwtToken(token string) (*casdoorsdk.Claims, error) {
	if mc.parseJwtTokenFunc != nil {
		return mc.parseJwtTokenFunc(token)
	}
	return &casdoorsdk.Claims{
		User: casdoorsdk.User{
			Name:        "test-user",
			DisplayName: "Test User",
			Avatar:      "https://example.com/avatar.png",
		},
	}, nil
}

func (mc *mockClient) GetUser(name string) (*casdoorsdk.User, error) {
	if mc.getUserFunc != nil {
		return mc.getUserFunc(name)
	}
	return &casdoorsdk.User{
		Name:        name,
		DisplayName: "Test User",
		Avatar:      "https://example.com/avatar.png",
	}, nil
}

func newTestConfig() Config {
	return Config{
		Endpoint:         "https://example.com",
		ClientID:         "test-client-id",
		ClientSecret:     "test-client-secret",
		Certificate:      "test-certificate",
		OrganizationName: "test-org",
		ApplicationName:  "test-app",
	}
}

func newTestClaims() *casdoorsdk.Claims {
	return &casdoorsdk.Claims{
		User: casdoorsdk.User{
			Name:        "test-user",
			DisplayName: "Test User",
			Avatar:      "https://example.com/avatar.png",
		},
	}
}

func newTestUser() *model.User {
	return &model.User{
		Model:       model.Model{ID: 1},
		Username:    "test-user",
		DisplayName: "Test User",
		Avatar:      "https://example.com/avatar.png",
	}
}

func setupTestAuthenticator(
	t *testing.T,
	db *gorm.DB,
	parseTokenFunc func(token string) (*casdoorsdk.Claims, error),
	getUserFunc func(name string) (*casdoorsdk.User, error),
) authn.Authenticator {
	client := newMockClient()
	client.parseJwtTokenFunc = parseTokenFunc
	client.getUserFunc = getUserFunc
	auth := New(newTestConfig(), db).(*authenticator)
	auth.client = client
	return auth
}

func setupMockDBForUser(t *testing.T, db *gorm.DB, dbMock sqlmock.Sqlmock, claims *casdoorsdk.Claims, user *model.User) {
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)

	dbMock.ExpectQuery("SELECT \\* FROM `user` WHERE username = \\? AND `user`\\.`deleted_at` IS NULL ORDER BY `user`\\.`id` LIMIT \\?").
		WithArgs(claims.Name, 1).
		WillReturnRows(sqlmock.NewRows(userDBColumns).AddRows(generateUserDBRows(*user)...))
}

func setupMockDBForUserUpdate(t *testing.T, db *gorm.DB, dbMock sqlmock.Sqlmock, user *model.User, updates map[string]any) {
	if len(updates) > 0 {
		dbMock.ExpectBegin()
		args := make([]driver.Value, 0)
		for range updates {
			args = append(args, sqlmock.AnyArg())
		}
		args = append(args, sqlmock.AnyArg()) // for updated_at timestamp
		args = append(args, user.ID)          // for WHERE clause

		dbMock.ExpectExec("UPDATE `user` SET .+ WHERE `user`\\.`deleted_at` IS NULL AND `id` = \\?").
			WithArgs(args...).
			WillReturnResult(sqlmock.NewResult(1, 1))
		dbMock.ExpectCommit()
	}
}

func TestNew(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		db, _, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		auth := New(newTestConfig(), db)

		assert.NotNil(t, auth)
		assert.IsType(t, &authenticator{}, auth)
	})
}

func TestAuthenticatorAuthenticate(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		expectedClaims := newTestClaims()
		expectedUser := newTestUser()
		expectedCasdoorUser := &casdoorsdk.User{
			Name:        "test-user",
			DisplayName: "Test User",
			Avatar:      "https://example.com/avatar.png",
		}

		auth := setupTestAuthenticator(t, db,
			func(token string) (*casdoorsdk.Claims, error) {
				return expectedClaims, nil
			},
			func(name string) (*casdoorsdk.User, error) {
				return expectedCasdoorUser, nil
			})

		setupMockDBForUser(t, db, dbMock, expectedClaims, expectedUser)
		setupMockDBForUserUpdate(t, db, dbMock, expectedUser, map[string]any{})

		user, err := auth.Authenticate(context.Background(), "valid-token")
		require.NoError(t, err)
		require.NotNil(t, user)
		assert.Equal(t, expectedClaims.Name, user.Username)
		assert.Equal(t, expectedClaims.DisplayName, user.DisplayName)
		assert.Equal(t, expectedClaims.Avatar, user.Avatar)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("UserInfoSync", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		expectedClaims := newTestClaims()
		expectedUser := &model.User{
			Model:       model.Model{ID: 1},
			Username:    "test-user",
			DisplayName: "Old Display Name",
			Avatar:      "https://example.com/old-avatar.png",
		}
		expectedCasdoorUser := &casdoorsdk.User{
			Name:        "test-user",
			DisplayName: "New Display Name",
			Avatar:      "https://example.com/new-avatar.png",
		}

		auth := setupTestAuthenticator(t, db,
			func(token string) (*casdoorsdk.Claims, error) {
				return expectedClaims, nil
			},
			func(name string) (*casdoorsdk.User, error) {
				return expectedCasdoorUser, nil
			})

		setupMockDBForUser(t, db, dbMock, expectedClaims, expectedUser)
		setupMockDBForUserUpdate(t, db, dbMock, expectedUser, map[string]any{
			"display_name": "New Display Name",
			"avatar":       "https://example.com/new-avatar.png",
		})

		user, err := auth.Authenticate(context.Background(), "valid-token")
		require.NoError(t, err)
		require.NotNil(t, user)
		assert.Equal(t, expectedClaims.Name, user.Username)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("PartialUserInfoSync", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		expectedClaims := newTestClaims()
		expectedUser := &model.User{
			Model:       model.Model{ID: 1},
			Username:    "test-user",
			DisplayName: "Old Display Name",
			Avatar:      "https://example.com/avatar.png",
		}
		expectedCasdoorUser := &casdoorsdk.User{
			Name:        "test-user",
			DisplayName: "New Display Name",
			Avatar:      "https://example.com/avatar.png",
		}

		auth := setupTestAuthenticator(t, db,
			func(token string) (*casdoorsdk.Claims, error) {
				return expectedClaims, nil
			},
			func(name string) (*casdoorsdk.User, error) {
				return expectedCasdoorUser, nil
			})

		setupMockDBForUser(t, db, dbMock, expectedClaims, expectedUser)
		setupMockDBForUserUpdate(t, db, dbMock, expectedUser, map[string]any{
			"display_name": "New Display Name",
		})

		user, err := auth.Authenticate(context.Background(), "valid-token")
		require.NoError(t, err)
		require.NotNil(t, user)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("ParseTokenFailure", func(t *testing.T) {
		db, _, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		expectedErr := errors.New("invalid token")
		auth := setupTestAuthenticator(t, db,
			func(token string) (*casdoorsdk.Claims, error) {
				return nil, expectedErr
			}, nil)

		user, err := auth.Authenticate(context.Background(), "invalid-token")
		require.Error(t, err)
		assert.Nil(t, user)
		assert.ErrorIs(t, err, authn.ErrUnauthorized)
		assert.Contains(t, err.Error(), "failed to parse token")
		assert.Contains(t, err.Error(), expectedErr.Error())
	})

	t.Run("FirstOrCreateUserFailure", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		expectedClaims := newTestClaims()
		auth := setupTestAuthenticator(t, db,
			func(token string) (*casdoorsdk.Claims, error) {
				return expectedClaims, nil
			}, nil)

		dbMockStmt := db.Session(&gorm.Session{DryRun: true}).
			Where("username = ?", expectedClaims.Name).
			First(&model.User{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		expectedDBErr := errors.New("database connection failed")
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(expectedDBErr)

		user, err := auth.Authenticate(context.Background(), "valid-token")
		require.Error(t, err)
		assert.Nil(t, user)
		assert.Contains(t, err.Error(), expectedClaims.Name)
		assert.Contains(t, err.Error(), expectedDBErr.Error())

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("GetUserFailure", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		expectedClaims := newTestClaims()
		expectedUser := newTestUser()
		expectedGetUserErr := errors.New("failed to get user from casdoor")

		auth := setupTestAuthenticator(t, db,
			func(token string) (*casdoorsdk.Claims, error) {
				return expectedClaims, nil
			},
			func(name string) (*casdoorsdk.User, error) {
				return nil, expectedGetUserErr
			})

		setupMockDBForUser(t, db, dbMock, expectedClaims, expectedUser)

		user, err := auth.Authenticate(context.Background(), "valid-token")
		require.Error(t, err)
		assert.Nil(t, user)
		assert.Contains(t, err.Error(), "failed to get user")
		assert.Contains(t, err.Error(), expectedClaims.Name)
		assert.Contains(t, err.Error(), expectedGetUserErr.Error())

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("UserUpdateFailure", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		expectedClaims := newTestClaims()
		expectedUser := &model.User{
			Model:       model.Model{ID: 1},
			Username:    "test-user",
			DisplayName: "Old Display Name",
			Avatar:      "https://example.com/avatar.png",
		}
		expectedCasdoorUser := &casdoorsdk.User{
			Name:        "test-user",
			DisplayName: "New Display Name",
			Avatar:      "https://example.com/avatar.png",
		}
		expectedUpdateErr := errors.New("database update failed")

		auth := setupTestAuthenticator(t, db,
			func(token string) (*casdoorsdk.Claims, error) {
				return expectedClaims, nil
			},
			func(name string) (*casdoorsdk.User, error) {
				return expectedCasdoorUser, nil
			})

		setupMockDBForUser(t, db, dbMock, expectedClaims, expectedUser)
		dbMock.ExpectBegin()
		args := []driver.Value{sqlmock.AnyArg(), sqlmock.AnyArg(), expectedUser.ID}
		dbMock.ExpectExec("UPDATE `user` SET .+ WHERE `user`\\.`deleted_at` IS NULL AND `id` = \\?").
			WithArgs(args...).
			WillReturnError(expectedUpdateErr)
		dbMock.ExpectRollback()

		user, err := auth.Authenticate(context.Background(), "valid-token")
		require.Error(t, err)
		assert.Nil(t, user)
		assert.Contains(t, err.Error(), "failed to update user")
		assert.Contains(t, err.Error(), expectedUser.Username)
		assert.Contains(t, err.Error(), expectedUpdateErr.Error())

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("EmptyToken", func(t *testing.T) {
		db, _, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		auth := setupTestAuthenticator(t, db,
			func(token string) (*casdoorsdk.Claims, error) {
				return nil, errors.New("empty token")
			}, nil)

		user, err := auth.Authenticate(context.Background(), "")
		require.Error(t, err)
		assert.Nil(t, user)
		assert.ErrorIs(t, err, authn.ErrUnauthorized)
		assert.Contains(t, err.Error(), "failed to parse token")
	})
}
