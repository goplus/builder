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
	"github.com/goplus/builder/spx-backend/internal/config"
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

func newTestConfig() config.CasdoorConfig {
	return config.CasdoorConfig{
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
	client := &mockClient{
		parseJwtTokenFunc: parseTokenFunc,
		getUserFunc:       getUserFunc,
	}
	auth := New(db, newTestConfig()).(*authenticator)
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

		auth := New(db, newTestConfig())

		assert.NotNil(t, auth)
		assert.IsType(t, &authenticator{}, auth)
	})
}

func TestAuthenticatorAuthenticate(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		wantClaims := newTestClaims()
		wantUser := newTestUser()
		wantCasdoorUser := &casdoorsdk.User{
			Name:        "test-user",
			DisplayName: "Test User",
			Avatar:      "https://example.com/avatar.png",
			Groups:      []string{"test-org/role:assetAdmin", "test-org/plan:plus"},
		}

		auth := setupTestAuthenticator(t, db,
			func(token string) (*casdoorsdk.Claims, error) {
				return wantClaims, nil
			},
			func(name string) (*casdoorsdk.User, error) {
				return wantCasdoorUser, nil
			})

		setupMockDBForUser(t, db, dbMock, wantClaims, wantUser)
		setupMockDBForUserUpdate(t, db, dbMock, wantUser, map[string]any{
			"roles": "assetAdmin",
			"plan":  "plus",
		})

		user, err := auth.Authenticate(context.Background(), "valid-token")
		require.NoError(t, err)
		require.NotNil(t, user)
		assert.Equal(t, wantClaims.Name, user.Username)
		assert.Equal(t, wantClaims.DisplayName, user.DisplayName)
		assert.Equal(t, wantClaims.Avatar, user.Avatar)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("UserInfoSync", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		wantClaims := newTestClaims()
		wantUser := &model.User{
			Model:       model.Model{ID: 1},
			Username:    "test-user",
			DisplayName: "Old Display Name",
			Avatar:      "https://example.com/old-avatar.png",
		}
		wantCasdoorUser := &casdoorsdk.User{
			Name:        "test-user",
			DisplayName: "New Display Name",
			Avatar:      "https://example.com/new-avatar.png",
		}

		auth := setupTestAuthenticator(t, db,
			func(token string) (*casdoorsdk.Claims, error) {
				return wantClaims, nil
			},
			func(name string) (*casdoorsdk.User, error) {
				return wantCasdoorUser, nil
			})

		setupMockDBForUser(t, db, dbMock, wantClaims, wantUser)
		setupMockDBForUserUpdate(t, db, dbMock, wantUser, map[string]any{
			"display_name": "New Display Name",
			"avatar":       "https://example.com/new-avatar.png",
		})

		user, err := auth.Authenticate(context.Background(), "valid-token")
		require.NoError(t, err)
		require.NotNil(t, user)
		assert.Equal(t, wantClaims.Name, user.Username)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("PartialUserInfoSync", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		wantClaims := newTestClaims()
		wantUser := &model.User{
			Model:       model.Model{ID: 1},
			Username:    "test-user",
			DisplayName: "Old Display Name",
			Avatar:      "https://example.com/avatar.png",
		}
		wantCasdoorUser := &casdoorsdk.User{
			Name:        "test-user",
			DisplayName: "New Display Name",
			Avatar:      "https://example.com/avatar.png",
		}

		auth := setupTestAuthenticator(t, db,
			func(token string) (*casdoorsdk.Claims, error) {
				return wantClaims, nil
			},
			func(name string) (*casdoorsdk.User, error) {
				return wantCasdoorUser, nil
			})

		setupMockDBForUser(t, db, dbMock, wantClaims, wantUser)
		setupMockDBForUserUpdate(t, db, dbMock, wantUser, map[string]any{
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

		wantErr := errors.New("invalid token")
		auth := setupTestAuthenticator(t, db,
			func(token string) (*casdoorsdk.Claims, error) {
				return nil, wantErr
			}, nil)

		user, err := auth.Authenticate(context.Background(), "invalid-token")
		require.Error(t, err)
		assert.Nil(t, user)
		assert.ErrorIs(t, err, authn.ErrUnauthorized)
		assert.Contains(t, err.Error(), "failed to parse token")
		assert.Contains(t, err.Error(), wantErr.Error())
	})

	t.Run("FirstOrCreateUserFailure", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		wantClaims := newTestClaims()
		auth := setupTestAuthenticator(t, db,
			func(token string) (*casdoorsdk.Claims, error) {
				return wantClaims, nil
			}, nil)

		dbMockStmt := db.Session(&gorm.Session{DryRun: true}).
			Where("username = ?", wantClaims.Name).
			First(&model.User{}).
			Statement
		dbMockArgs := modeltest.ToDriverValueSlice(dbMockStmt.Vars...)
		wantDBErr := errors.New("database connection failed")
		dbMock.ExpectQuery(regexp.QuoteMeta(dbMockStmt.SQL.String())).
			WithArgs(dbMockArgs...).
			WillReturnError(wantDBErr)

		user, err := auth.Authenticate(context.Background(), "valid-token")
		require.Error(t, err)
		assert.Nil(t, user)
		assert.Contains(t, err.Error(), wantClaims.Name)
		assert.Contains(t, err.Error(), wantDBErr.Error())

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("GetUserFailure", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		wantClaims := newTestClaims()
		wantUser := newTestUser()
		wantGetUserErr := errors.New("failed to get user from casdoor")

		auth := setupTestAuthenticator(t, db,
			func(token string) (*casdoorsdk.Claims, error) {
				return wantClaims, nil
			},
			func(name string) (*casdoorsdk.User, error) {
				return nil, wantGetUserErr
			})

		setupMockDBForUser(t, db, dbMock, wantClaims, wantUser)

		user, err := auth.Authenticate(context.Background(), "valid-token")
		require.Error(t, err)
		assert.Nil(t, user)
		assert.Contains(t, err.Error(), "failed to get user")
		assert.Contains(t, err.Error(), wantClaims.Name)
		assert.Contains(t, err.Error(), wantGetUserErr.Error())

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("UserUpdateFailure", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		wantClaims := newTestClaims()
		wantUser := &model.User{
			Model:       model.Model{ID: 1},
			Username:    "test-user",
			DisplayName: "Old Display Name",
			Avatar:      "https://example.com/avatar.png",
		}
		wantCasdoorUser := &casdoorsdk.User{
			Name:        "test-user",
			DisplayName: "New Display Name",
			Avatar:      "https://example.com/avatar.png",
		}
		wantUpdateErr := errors.New("database update failed")

		auth := setupTestAuthenticator(t, db,
			func(token string) (*casdoorsdk.Claims, error) {
				return wantClaims, nil
			},
			func(name string) (*casdoorsdk.User, error) {
				return wantCasdoorUser, nil
			})

		setupMockDBForUser(t, db, dbMock, wantClaims, wantUser)
		dbMock.ExpectBegin()
		args := []driver.Value{sqlmock.AnyArg(), sqlmock.AnyArg(), wantUser.ID}
		dbMock.ExpectExec("UPDATE `user` SET .+ WHERE `user`\\.`deleted_at` IS NULL AND `id` = \\?").
			WithArgs(args...).
			WillReturnError(wantUpdateErr)
		dbMock.ExpectRollback()

		user, err := auth.Authenticate(context.Background(), "valid-token")
		require.Error(t, err)
		assert.Nil(t, user)
		assert.Contains(t, err.Error(), "failed to update user")
		assert.Contains(t, err.Error(), wantUser.Username)
		assert.Contains(t, err.Error(), wantUpdateErr.Error())

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

func TestAuthenticatorExtractUserRolesFromGroups(t *testing.T) {
	for _, tt := range []struct {
		name   string
		groups []string
		want   string
	}{
		{
			name:   "SingleRole",
			groups: []string{"test-org/role:assetAdmin"},
			want:   "assetAdmin",
		},
		{
			name:   "MultipleRoles",
			groups: []string{"test-org/role:assetAdmin", "test-org/role:moderator"},
			want:   "assetAdmin,moderator",
		},
		{
			name:   "MixedGroupsWithRoles",
			groups: []string{"test-org/plan:plus", "test-org/role:assetAdmin", "OtherOrg/other:value"},
			want:   "assetAdmin",
		},
		{
			name:   "NoRoles",
			groups: []string{"test-org/plan:plus", "OtherOrg/other:value"},
			want:   "",
		},
		{
			name:   "EmptyGroups",
			groups: []string{},
			want:   "",
		},
		{
			name:   "NilGroups",
			groups: nil,
			want:   "",
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			a := &authenticator{orgName: "test-org"}
			got := a.extractUserRolesFromGroups(tt.groups)
			assert.Equal(t, tt.want, got.String())
		})
	}
}

func TestAuthenticatorExtractUserPlanFromGroups(t *testing.T) {
	for _, tt := range []struct {
		name   string
		groups []string
		want   model.UserPlan
	}{
		{
			name:   "PlusPlan",
			groups: []string{"test-org/plan:plus"},
			want:   model.UserPlanPlus,
		},
		{
			name:   "FreePlan",
			groups: []string{"test-org/plan:free"},
			want:   model.UserPlanFree,
		},
		{
			name:   "MixedGroupsWithPlan",
			groups: []string{"test-org/role:assetAdmin", "test-org/plan:plus", "OtherOrg/other:value"},
			want:   model.UserPlanPlus,
		},
		{
			name:   "NoPlanDefaultsToFree",
			groups: []string{"test-org/role:assetAdmin", "OtherOrg/other:value"},
			want:   model.UserPlanFree,
		},
		{
			name:   "EmptyGroupsDefaultsToFree",
			groups: []string{},
			want:   model.UserPlanFree,
		},
		{
			name:   "NilGroupsDefaultsToFree",
			groups: nil,
			want:   model.UserPlanFree,
		},
		{
			name:   "UnknownPlanDefaultsToFree",
			groups: []string{"test-org/plan:unknown"},
			want:   model.UserPlanFree,
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			a := &authenticator{orgName: "test-org"}
			got := a.extractUserPlanFromGroups(tt.groups)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestFixAvatar(t *testing.T) {
	tests := []struct {
		name   string
		avatar string
		want   string
	}{
		{
			name:   "HTTP QQ Avatar Domain",
			avatar: "http://thirdqq.qlogo.cn/avatar.jpg",
			want:   "https://thirdqq.qlogo.cn/avatar.jpg",
		},
		{
			name:   "HTTP QQ Avatar Domain with Path",
			avatar: "http://thirdqq.qlogo.cn/g?b=qq&nk=123456&s=100",
			want:   "https://thirdqq.qlogo.cn/g?b=qq&nk=123456&s=100",
		},
		{
			name:   "HTTPS QQ Avatar Domain - No Change",
			avatar: "https://thirdqq.qlogo.cn/avatar.jpg",
			want:   "https://thirdqq.qlogo.cn/avatar.jpg",
		},
		{
			name:   "Other HTTP Domain - No Change",
			avatar: "http://example.com/avatar.jpg",
			want:   "http://example.com/avatar.jpg",
		},
		{
			name:   "HTTPS Domain - No Change",
			avatar: "https://example.com/avatar.jpg",
			want:   "https://example.com/avatar.jpg",
		},
		{
			name:   "Empty Avatar",
			avatar: "",
			want:   "",
		},
		{
			name:   "Relative Path - No Change",
			avatar: "/path/to/avatar.jpg",
			want:   "/path/to/avatar.jpg",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := fixAvatar(tt.avatar)
			assert.Equal(t, tt.want, got)
		})
	}
}
