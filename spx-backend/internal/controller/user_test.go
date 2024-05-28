package controller

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestUser() *User {
	return &User{
		Id:    "fake-id",
		Name:  "fake-name",
		Owner: "fake-owner",
	}
}

func newContextWithTestUser(ctx context.Context) context.Context {
	return NewContextWithUser(ctx, newTestUser())
}

func TestNewContextWithUser(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ctx := NewContextWithUser(context.Background(), newTestUser())
		user, ok := ctx.Value(userContextKey).(*User)
		require.True(t, ok)
		require.NotNil(t, user)
		assert.Equal(t, "fake-name", user.Name)
	})
}

func TestUserFromContext(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ctx := newContextWithTestUser(context.Background())
		user, ok := UserFromContext(ctx)
		require.True(t, ok)
		require.NotNil(t, user)
		assert.Equal(t, "fake-name", user.Name)
	})

	t.Run("NoUser", func(t *testing.T) {
		user, ok := UserFromContext(context.Background())
		require.False(t, ok)
		require.Nil(t, user)
	})
}

func TestEnsureUser(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ctx := newContextWithTestUser(context.Background())
		user, err := EnsureUser(ctx, "fake-name")
		require.NoError(t, err)
		require.NotNil(t, user)
	})

	t.Run("NoUser", func(t *testing.T) {
		_, err := EnsureUser(context.Background(), "fake-name")
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrUnauthorized)
	})

	t.Run("UnexpectedUser", func(t *testing.T) {
		ctx := newContextWithTestUser(context.Background())
		_, err := EnsureUser(ctx, "unexpected-name")
		require.Error(t, err)
		assert.ErrorIs(t, err, ErrForbidden)
	})
}

const fakeUserToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9." +
	"eyJvd25lciI6IkdvUGx1cyIsIm5hbWUiOiJmYWtlLW5hbWUiLCJpZCI6IjEiLCJpc3MiOiJHb1BsdXMiLCJzdWIiOiIxIiwiZXhwIjo0ODcwNDI5MDQwfQ." +
	"X0T-v-RJggMRy3Mmui2FoRH-_4DQsNA6DekUx1BfIljTZaEbHbuW59dSlKQ-i2MuYD7_8mI18vZqT3iysbKQ1T70NF97B_A130ML3pulZWlj1ZokgjCkVug25QRbq_N7JMd4apJZFlyZj8Bd2VfqtAKMlJJ4HzKzNXB-GBogDVlKeu4xJ1BiXO2rHL1PNa5KyKLSSMXmuP_Wc108RXZ0BiKDE30IG1fvcyvudXcetmltuWjuU6JRj3FGedxuVEqZLXqcm13dCxHnuFV1x1XU9KExcDvVyVB91FpBe5npzYp6WMX0fx9vU1b4eJ69EZoeMdMolhmvYInT1G8r1PEmbg"

func TestControllerUserFromToken(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		ctrl, _, err := newTestController(t)
		require.NoError(t, err)

		user, err := ctrl.UserFromToken(fakeUserToken)
		require.NoError(t, err)
		require.NotNil(t, user)
		assert.Equal(t, "fake-name", user.Name)
	})

	t.Run("InvalidToken", func(t *testing.T) {
		ctrl, _, err := newTestController(t)
		require.NoError(t, err)

		_, err = ctrl.UserFromToken("invalid-token")
		require.Error(t, err)
		assert.EqualError(t, err, "ctrl.casdoorClient.ParseJwtToken failed: token contains an invalid number of segments")
	})
}
