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
	rateLimiter := &mockRateLimiter{}
	return New(&gorm.DB{}, pdp, quotaTracker, rateLimiter)
}

func newTestUserCapabilities() UserCapabilities {
	return UserCapabilities{
		CanManageAssets:                       true,
		CanUsePremiumLLM:                      false,
		CopilotMessageQuota:                   100,
		CopilotMessageQuotaLeft:               85,
		CopilotMessageRateLimit:               30,
		CopilotMessageRateWindowSeconds:       60,
		AIDescriptionQuota:                    300,
		AIDescriptionQuotaLeft:                290,
		AIDescriptionRateLimit:                10,
		AIDescriptionRateWindowSeconds:        60,
		AIInteractionTurnQuota:                12000,
		AIInteractionTurnQuotaLeft:            11700,
		AIInteractionTurnRateLimit:            20,
		AIInteractionTurnRateWindowSeconds:    60,
		AIInteractionArchiveQuota:             8000,
		AIInteractionArchiveQuotaLeft:         7600,
		AIInteractionArchiveRateLimit:         10,
		AIInteractionArchiveRateWindowSeconds: 60,
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
