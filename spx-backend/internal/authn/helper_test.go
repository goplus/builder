package authn

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEnsureUser(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		mExpectedUser := newTestUser()
		ctx := NewContextWithUser(context.Background(), mExpectedUser)

		mUser, err := EnsureUser(ctx, 1)
		require.NoError(t, err)
		require.NotNil(t, mUser)
		assert.Equal(t, *mExpectedUser, *mUser)
	})

	t.Run("ErrUnauthorized", func(t *testing.T) {
		_, err := EnsureUser(context.Background(), 1)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnauthorized)
	})

	t.Run("ErrForbidden", func(t *testing.T) {
		mExpectedUser := newTestUser()
		ctx := NewContextWithUser(context.Background(), mExpectedUser)

		_, err := EnsureUser(ctx, 65535)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrForbidden)
	})

	t.Run("DifferentUserID", func(t *testing.T) {
		mExpectedUser := newTestUser()
		mExpectedUser.ID = 42
		ctx := NewContextWithUser(context.Background(), mExpectedUser)

		_, err := EnsureUser(ctx, 1)
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrForbidden)
	})

	t.Run("MatchingUserID", func(t *testing.T) {
		mExpectedUser := newTestUser()
		mExpectedUser.ID = 100
		ctx := NewContextWithUser(context.Background(), mExpectedUser)

		mUser, err := EnsureUser(ctx, 100)
		require.NoError(t, err)
		require.NotNil(t, mUser)
		assert.Equal(t, int64(100), mUser.ID)
	})
}
