package authz

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func newTestAuthorizer() *Authorizer {
	pdp := &mockPolicyDecisionPoint{}
	quotaTracker := &mockQuotaTracker{}
	return New(&gorm.DB{}, pdp, quotaTracker)
}

func newTestUserCapabilities() UserCapabilities {
	const quotaWindow = 24 * 60 * 60
	return UserCapabilities{
		CanManageAssets:  true,
		CanUsePremiumLLM: false,
		CopilotMessageQuota: Quota{
			Limit:     100,
			Remaining: 85,
			Window:    quotaWindow,
		},
		AIDescriptionQuota: Quota{
			Limit:     300,
			Remaining: 290,
			Window:    quotaWindow,
		},
		AIInteractionTurnQuota: Quota{
			Limit:     12000,
			Remaining: 11700,
			Window:    quotaWindow,
		},
		AIInteractionArchiveQuota: Quota{
			Limit:     8000,
			Remaining: 7600,
			Window:    quotaWindow,
		},
	}
}

func TestNewContextWithAuthorizer(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		wantAuthorizer := newTestAuthorizer()
		ctx := newContextWithAuthorizer(context.Background(), wantAuthorizer)

		authorizer, ok := ctx.Value(authorizerContextKey{}).(*Authorizer)
		require.True(t, ok)
		assert.Equal(t, wantAuthorizer, authorizer)
	})

	t.Run("NilAuthorizer", func(t *testing.T) {
		ctx := newContextWithAuthorizer(context.Background(), nil)

		value := ctx.Value(authorizerContextKey{})
		assert.Nil(t, value)
	})
}

func TestAuthorizerFromContext(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		wantAuthorizer := newTestAuthorizer()
		ctx := newContextWithAuthorizer(context.Background(), wantAuthorizer)

		authorizer, ok := authorizerFromContext(ctx)
		require.True(t, ok)
		assert.Equal(t, wantAuthorizer, authorizer)
	})

	t.Run("NoAuthorizer", func(t *testing.T) {
		authorizer, ok := authorizerFromContext(context.Background())
		require.False(t, ok)
		require.Nil(t, authorizer)
	})

	t.Run("WrongContextValue", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), authorizerContextKey{}, "not-authorizer")

		authorizer, ok := authorizerFromContext(ctx)
		require.False(t, ok)
		require.Nil(t, authorizer)
	})
}

func TestNewContextWithUserCapabilities(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		wantCaps := newTestUserCapabilities()
		ctx := NewContextWithUserCapabilities(context.Background(), wantCaps)

		caps, ok := ctx.Value(userCapabilitiesContextKey{}).(UserCapabilities)
		require.True(t, ok)
		assert.Equal(t, wantCaps, caps)
	})

	t.Run("ZeroCapabilities", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{})

		value := ctx.Value(userCapabilitiesContextKey{})
		assert.Zero(t, value)
	})
}

func TestUserCapabilitiesFromContext(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		wantCaps := newTestUserCapabilities()
		ctx := NewContextWithUserCapabilities(context.Background(), wantCaps)

		caps, ok := UserCapabilitiesFromContext(ctx)
		require.True(t, ok)
		assert.Equal(t, wantCaps, caps)
	})

	t.Run("NoCapabilities", func(t *testing.T) {
		caps, ok := UserCapabilitiesFromContext(context.Background())
		require.False(t, ok)
		require.Zero(t, caps)
	})

	t.Run("WrongContextValue", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), userCapabilitiesContextKey{}, "not-capabilities")

		caps, ok := UserCapabilitiesFromContext(ctx)
		require.False(t, ok)
		require.Zero(t, caps)
	})
}
