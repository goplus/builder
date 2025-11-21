package authz

import (
	"context"
	"testing"
	"time"

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
	return UserCapabilities{
		CanManageAssets:  true,
		CanManageCourses: false,
		CanUsePremiumLLM: true,
	}
}

func newTestUserQuotaPolicies() UserQuotaPolicies {
	return UserQuotaPolicies{
		Limits: map[Resource]QuotaPolicy{
			ResourceCopilotMessage: {
				Name:     "copilotMessage:limit",
				Resource: ResourceCopilotMessage,
				Limit:    100,
				Window:   24 * time.Hour,
			},
			ResourceAIDescription: {
				Name:     "aiDescription:limit",
				Resource: ResourceAIDescription,
				Limit:    300,
				Window:   24 * time.Hour,
			},
			ResourceAIInteractionTurn: {
				Name:     "aiInteractionTurn:limit",
				Resource: ResourceAIInteractionTurn,
				Limit:    12000,
				Window:   24 * time.Hour,
			},
			ResourceAIInteractionArchive: {
				Name:     "aiInteractionArchive:limit",
				Resource: ResourceAIInteractionArchive,
				Limit:    8000,
				Window:   24 * time.Hour,
			},
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

func TestNewContextWithUserQuotaPolicies(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		wantQuotaPolicies := newTestUserQuotaPolicies()
		ctx := NewContextWithUserQuotaPolicies(context.Background(), wantQuotaPolicies)

		quotaPolicies, ok := ctx.Value(userQuotaPoliciesContextKey{}).(UserQuotaPolicies)
		require.True(t, ok)
		assert.Equal(t, wantQuotaPolicies, quotaPolicies)
	})

	t.Run("ZeroQuotaPolicies", func(t *testing.T) {
		ctx := NewContextWithUserQuotaPolicies(context.Background(), UserQuotaPolicies{})

		value := ctx.Value(userQuotaPoliciesContextKey{})
		assert.Zero(t, value)
	})
}

func TestUserQuotaPoliciesFromContext(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		wantQuotaPolicies := newTestUserQuotaPolicies()
		ctx := NewContextWithUserQuotaPolicies(context.Background(), wantQuotaPolicies)

		quotaPolicies, ok := UserQuotaPoliciesFromContext(ctx)
		require.True(t, ok)
		assert.Equal(t, wantQuotaPolicies, quotaPolicies)
	})

	t.Run("NoQuotaPolicies", func(t *testing.T) {
		quotas, ok := UserQuotaPoliciesFromContext(context.Background())
		require.False(t, ok)
		require.Zero(t, quotas)
	})

	t.Run("WrongContextValue", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), userQuotaPoliciesContextKey{}, "not-quotas")

		quotaPolicies, ok := UserQuotaPoliciesFromContext(ctx)
		require.False(t, ok)
		require.Zero(t, quotaPolicies)
	})
}
