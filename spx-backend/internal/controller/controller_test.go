package controller

import (
	"context"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/goplus/builder/spx-backend/internal/aigc"
	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/builder/spx-backend/internal/model/modeltest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setTestEnv(t *testing.T) {
	t.Setenv("GOP_SPX_DSN", "root:root@tcp(mysql.example.com:3306)/builder?charset=utf8&parseTime=True")
	t.Setenv("AIGC_ENDPOINT", "https://aigc.example.com")

	t.Setenv("KODO_AK", "test-kodo-ak")
	t.Setenv("KODO_SK", "test-kodo-sk")
	t.Setenv("KODO_BUCKET", "builder")
	t.Setenv("KODO_BUCKET_REGION", "earth")
	t.Setenv("KODO_BASE_URL", "https://kodo.example.com")
}

const testUserToken = "test-user-token"

type mockAuthenticator struct{}

func (mockAuthenticator) Authenticate(ctx context.Context, token string) (*model.User, error) {
	if token == testUserToken {
		return &model.User{
			Model:              model.Model{ID: 1},
			Username:           "test-user",
			DisplayName:        "",
			Avatar:             "",
			Description:        "Test description",
			FollowerCount:      10,
			FollowingCount:     5,
			ProjectCount:       3,
			PublicProjectCount: 2,
			LikedProjectCount:  15,
		}, nil
	}
	return nil, authn.ErrUnauthorized
}

func newTestController(t *testing.T) (ctrl *Controller, dbMock sqlmock.Sqlmock, closeDB func() error) {
	setTestEnv(t)

	db, dbMock, closeDB, err := modeltest.NewMockDB()
	require.NoError(t, err)

	logger := log.GetLogger()
	kodoConfig := newKodoConfig(logger)
	authenticator := &mockAuthenticator{}
	aigcClient := aigc.NewAigcClient(mustEnv(logger, "AIGC_ENDPOINT"))

	return &Controller{
		db:            db,
		kodo:          kodoConfig,
		authenticator: authenticator,
		aigcClient:    aigcClient,
	}, dbMock, closeDB
}

func TestEnvOrDefault(t *testing.T) {
	t.Setenv("ENV_VAR", "custom")

	t.Run("Valid", func(t *testing.T) {
		assert.Equal(t, "custom", envOrDefault("ENV_VAR", "default"))
	})

	t.Run("Invalid", func(t *testing.T) {
		assert.Equal(t, "default", envOrDefault("INVALID_ENV_VAR", "default"))
	})
}

func TestSortOrder(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		assert.True(t, SortOrderAsc.IsValid())
		assert.True(t, SortOrderDesc.IsValid())
	})

	t.Run("Invalid", func(t *testing.T) {
		assert.False(t, SortOrder("invalid").IsValid())
	})
}

func TestPagination(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		p := Pagination{Index: 1, Size: 20}
		assert.True(t, p.IsValid())
	})

	t.Run("InvalidIndex", func(t *testing.T) {
		p := Pagination{Index: 0, Size: 20}
		assert.False(t, p.IsValid())
	})

	t.Run("InvalidSize", func(t *testing.T) {
		p := Pagination{Index: 1, Size: 0}
		assert.False(t, p.IsValid())
	})

	t.Run("SizeExceedsMaximum", func(t *testing.T) {
		p := Pagination{Index: 1, Size: 101}
		assert.False(t, p.IsValid())
	})

	t.Run("Offset", func(t *testing.T) {
		p := Pagination{Index: 3, Size: 20}
		assert.Equal(t, 40, p.Offset())
	})
}

func ptr[T any](v T) *T {
	return &v
}
