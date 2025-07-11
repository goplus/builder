package authn

import (
	"context"
	"testing"

	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestUser() *model.User {
	return &model.User{
		Model:       model.Model{ID: 1},
		Username:    "test-user",
		DisplayName: "Test User",
		Avatar:      "https://example.com/avatar.png",
	}
}

func TestNewContextWithUser(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		mExpectedUser := newTestUser()
		ctx := NewContextWithUser(context.Background(), mExpectedUser)

		mUser, ok := ctx.Value(userContextKey{}).(*model.User)
		require.True(t, ok)
		require.NotNil(t, mUser)
		assert.Equal(t, *mExpectedUser, *mUser)
	})

	t.Run("NilUser", func(t *testing.T) {
		ctx := NewContextWithUser(context.Background(), nil)

		value := ctx.Value(userContextKey{})
		assert.Nil(t, value)
	})
}

func TestUserFromContext(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		mExpectedUser := newTestUser()
		ctx := NewContextWithUser(context.Background(), mExpectedUser)

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

	t.Run("WrongContextValue", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), userContextKey{}, "not-a-user")

		mUser, ok := UserFromContext(ctx)
		require.False(t, ok)
		require.Nil(t, mUser)
	})
}
