package casdoor

import (
	"context"
	"database/sql/driver"
	"errors"
	"fmt"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/casdoor/casdoor-go-sdk/casdoorsdk"
	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/avatar"
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
	casdoorUser := newTestCasdoorUser()
	return &casdoorsdk.Claims{User: *casdoorUser}, nil
}

func (mc *mockClient) GetUser(name string) (*casdoorsdk.User, error) {
	if mc.getUserFunc != nil {
		return mc.getUserFunc(name)
	}
	casdoorUser := newTestCasdoorUser()
	if name != casdoorUser.Name {
		return nil, errors.New("user not found")
	}
	return casdoorUser, nil
}

type mockAvatarManager struct {
	uploadFromURLFunc func(context.Context, string) (string, error)
	uploadDefaultFunc func(context.Context, []byte) (string, error)
}

func (m mockAvatarManager) UploadFromURL(ctx context.Context, sourceURL string) (string, error) {
	if m.uploadFromURLFunc != nil {
		return m.uploadFromURLFunc(ctx, sourceURL)
	}
	return sourceURL, nil
}

func (m mockAvatarManager) UploadDefault(ctx context.Context, seed []byte) (string, error) {
	if m.uploadDefaultFunc != nil {
		return m.uploadDefaultFunc(ctx, seed)
	}
	return fmt.Sprintf("default-%x", seed), nil
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

func newTestUser() *model.User {
	return &model.User{
		Model:       model.Model{ID: 1},
		Username:    "test-user",
		DisplayName: "Test User",
		Avatar:      "kodo://test-bucket/avatar-key",
	}
}

func newTestCasdoorUser() *casdoorsdk.User {
	user := newTestUser()
	return &casdoorsdk.User{
		Name:        user.Username,
		DisplayName: user.DisplayName,
		Avatar:      user.Avatar,
	}
}

func setupTestAuthenticator(
	t *testing.T,
	db *gorm.DB,
	parseTokenFunc func(token string) (*casdoorsdk.Claims, error),
	getUserFunc func(name string) (*casdoorsdk.User, error),
	avatarMmanager avatar.Manager,
) *authenticator {
	client := &mockClient{
		parseJwtTokenFunc: parseTokenFunc,
		getUserFunc:       getUserFunc,
	}
	if avatarMmanager == nil {
		avatarMmanager = mockAvatarManager{}
	}
	authn, err := New(db, newTestConfig(), avatarMmanager)
	require.NoError(t, err)
	auth := authn.(*authenticator)
	auth.client = client
	return auth
}

func setupMockDBForUser(t *testing.T, db *gorm.DB, dbMock sqlmock.Sqlmock, user *model.User) {
	userDBColumns, err := modeltest.ExtractDBColumns(db, model.User{})
	require.NoError(t, err)
	generateUserDBRows, err := modeltest.NewDBRowsGenerator(db, model.User{})
	require.NoError(t, err)

	dbMock.ExpectQuery("SELECT \\* FROM `user` WHERE username = \\? AND `user`\\.`deleted_at` IS NULL ORDER BY `user`\\.`id` LIMIT \\?").
		WithArgs(user.Username, 1).
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

		auth, err := New(db, newTestConfig(), mockAvatarManager{})
		require.NoError(t, err)

		assert.NotNil(t, auth)
		assert.IsType(t, &authenticator{}, auth)
	})
}

func TestAuthenticatorAuthenticate(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		user := newTestUser()
		casdoorUser := newTestCasdoorUser()

		auth := setupTestAuthenticator(t, db,
			func(token string) (*casdoorsdk.Claims, error) {
				return &casdoorsdk.Claims{User: *casdoorUser}, nil
			},
			func(name string) (*casdoorsdk.User, error) {
				return casdoorUser, nil
			},
			nil)

		setupMockDBForUser(t, db, dbMock, user)

		gotUser, err := auth.Authenticate(context.Background(), "valid-token")
		require.NoError(t, err)
		require.NotNil(t, gotUser)
		assert.Equal(t, user.Username, gotUser.Username)
		assert.Equal(t, user.DisplayName, gotUser.DisplayName)
		assert.Equal(t, user.Avatar, gotUser.Avatar)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("RolesAndPlanSync", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		user := newTestUser()
		casdoorUser := newTestCasdoorUser()
		casdoorUser.DisplayName = "New Display Name"              // Will be ignored for existing users
		casdoorUser.Avatar = "https://example.com/new-avatar.png" // Will be ignored for existing users
		casdoorUser.Groups = []string{"test-org/role:assetAdmin", "test-org/plan:plus"}

		auth := setupTestAuthenticator(t, db,
			func(token string) (*casdoorsdk.Claims, error) {
				return &casdoorsdk.Claims{User: *casdoorUser}, nil
			},
			func(name string) (*casdoorsdk.User, error) {
				return casdoorUser, nil
			},
			nil)

		setupMockDBForUser(t, db, dbMock, user)
		setupMockDBForUserUpdate(t, db, dbMock, user, map[string]any{
			"roles": "assetAdmin",
			"plan":  "plus",
		})

		gotUser, err := auth.Authenticate(context.Background(), "valid-token")
		require.NoError(t, err)
		require.NotNil(t, gotUser)
		assert.Equal(t, user.Username, gotUser.Username)
		assert.Equal(t, user.DisplayName, gotUser.DisplayName)
		assert.Equal(t, user.Avatar, gotUser.Avatar)
		assert.Equal(t, model.UserRoles{"assetAdmin"}, gotUser.Roles)
		assert.Equal(t, model.UserPlanPlus, gotUser.Plan)

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
			},
			nil,
			nil)

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

		casdoorUser := newTestCasdoorUser()

		auth := setupTestAuthenticator(t, db,
			func(token string) (*casdoorsdk.Claims, error) {
				return &casdoorsdk.Claims{User: *casdoorUser}, nil
			},
			nil,
			nil)

		dbMockStmt := db.Session(&gorm.Session{DryRun: true}).
			Where("username = ?", casdoorUser.Name).
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
		assert.Contains(t, err.Error(), casdoorUser.Name)
		assert.Contains(t, err.Error(), wantDBErr.Error())

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("GetUserFailure", func(t *testing.T) {
		db, _, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		casdoorUser := newTestCasdoorUser()
		errGetUser := errors.New("failed to get user from casdoor")

		auth := setupTestAuthenticator(t, db,
			func(token string) (*casdoorsdk.Claims, error) {
				return &casdoorsdk.Claims{User: *casdoorUser}, nil
			},
			func(name string) (*casdoorsdk.User, error) {
				return nil, errGetUser
			},
			nil)

		user, err := auth.Authenticate(context.Background(), "valid-token")
		require.Error(t, err)
		assert.Nil(t, user)
		assert.Contains(t, err.Error(), "failed to get user")
		assert.Contains(t, err.Error(), casdoorUser.Name)
		assert.Contains(t, err.Error(), errGetUser.Error())
	})

	t.Run("UserUpdateFailure", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		user := newTestUser()
		casdoorUser := newTestCasdoorUser()
		casdoorUser.Groups = []string{"test-org/role:assetAdmin", "test-org/plan:plus"}
		errUpdate := errors.New("database update failed")

		auth := setupTestAuthenticator(t, db,
			func(token string) (*casdoorsdk.Claims, error) {
				return &casdoorsdk.Claims{User: *casdoorUser}, nil
			},
			func(name string) (*casdoorsdk.User, error) {
				return casdoorUser, nil
			},
			nil)

		setupMockDBForUser(t, db, dbMock, user)

		dbMock.ExpectBegin()
		args := []driver.Value{sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), user.ID}
		dbMock.ExpectExec("UPDATE `user` SET .+ WHERE `user`\\.`deleted_at` IS NULL AND `id` = \\?").
			WithArgs(args...).
			WillReturnError(errUpdate)
		dbMock.ExpectRollback()

		gotUser, err := auth.Authenticate(context.Background(), "valid-token")
		require.Error(t, err)
		assert.Nil(t, gotUser)
		assert.Contains(t, err.Error(), "failed to update user")
		assert.Contains(t, err.Error(), user.Username)
		assert.Contains(t, err.Error(), errUpdate.Error())

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("EmptyToken", func(t *testing.T) {
		db, _, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		auth := setupTestAuthenticator(t, db,
			func(token string) (*casdoorsdk.Claims, error) {
				return nil, errors.New("empty token")
			},
			nil,
			nil)

		user, err := auth.Authenticate(context.Background(), "")
		require.Error(t, err)
		assert.Nil(t, user)
		assert.ErrorIs(t, err, authn.ErrUnauthorized)
		assert.Contains(t, err.Error(), "failed to parse token")
	})
}

func TestAuthenticatorCreateUser(t *testing.T) {
	t.Run("UploadFailure", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		auth := setupTestAuthenticator(t, db, nil, nil, mockAvatarManager{
			uploadFromURLFunc: func(context.Context, string) (string, error) {
				return "", errors.New("upload failed")
			},
		})

		casdoorUser := newTestCasdoorUser()
		casdoorUser.Avatar = "https://example.com/avatar.png"
		user, err := auth.createUser(context.Background(), casdoorUser)
		require.Error(t, err)
		assert.Nil(t, user)
		assert.Contains(t, err.Error(), "prepare avatar")

		require.NoError(t, dbMock.ExpectationsWereMet())
	})
}

func TestAuthenticatorSyncUser(t *testing.T) {
	t.Run("UploadsAvatar", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		const newAvatar = "kodo://test-bucket/new-avatar"
		var fetchedSource string
		auth := setupTestAuthenticator(t, db, nil, nil, mockAvatarManager{
			uploadFromURLFunc: func(_ context.Context, source string) (string, error) {
				fetchedSource = source
				return newAvatar, nil
			},
		})

		user := &model.User{
			Model:    model.Model{ID: 1},
			Username: "test-user",
			Avatar:   "https://example.com/old-avatar.png",
		}
		casdoorUser := &casdoorsdk.User{
			Name:        user.Username,
			DisplayName: user.DisplayName,
			Avatar:      "https://example.com/source-avatar.png",
		}

		setupMockDBForUserUpdate(t, db, dbMock, user, map[string]any{
			"avatar": newAvatar,
		})

		gotUser, err := auth.syncUser(context.Background(), user, casdoorUser)
		require.NoError(t, err)
		require.NotNil(t, gotUser)
		assert.Equal(t, newAvatar, gotUser.Avatar)
		assert.Equal(t, "https://example.com/source-avatar.png", fetchedSource)

		require.NoError(t, dbMock.ExpectationsWereMet())
	})

	t.Run("UploadFailureFallsBack", func(t *testing.T) {
		db, dbMock, closeDB, err := modeltest.NewMockDB()
		require.NoError(t, err)
		defer closeDB()

		auth := setupTestAuthenticator(t, db, nil, nil, mockAvatarManager{
			uploadFromURLFunc: func(context.Context, string) (string, error) {
				return "", errors.New("upload failed")
			},
		})

		user := &model.User{
			Model:    model.Model{ID: 1},
			Username: "test-user",
			Avatar:   "https://example.com/old-avatar.png",
		}
		casdoorUser := &casdoorsdk.User{
			Name:        user.Username,
			DisplayName: user.DisplayName,
			Avatar:      "https://example.com/source-avatar.png",
		}

		gotUser, err := auth.syncUser(context.Background(), user, casdoorUser)
		require.NoError(t, err)
		require.NotNil(t, gotUser)
		assert.Equal(t, "https://example.com/old-avatar.png", gotUser.Avatar)

		require.NoError(t, dbMock.ExpectationsWereMet())
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
