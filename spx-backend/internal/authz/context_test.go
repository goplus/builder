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

func newTestUserQuotas() UserQuotas {
	const quotaWindow = 24 * time.Hour
	return UserQuotas{
		Limits: map[Resource]Quota{
			ResourceCopilotMessage: {
				QuotaPolicy: QuotaPolicy{
					Name:     "copilotMessage:limit",
					Resource: ResourceCopilotMessage,
					Limit:    100,
					Window:   quotaWindow,
				},
				QuotaUsage: QuotaUsage{Used: 15},
			},
			ResourceAIDescription: {
				QuotaPolicy: QuotaPolicy{
					Name:     "aiDescription:limit",
					Resource: ResourceAIDescription,
					Limit:    300,
					Window:   quotaWindow,
				},
				QuotaUsage: QuotaUsage{Used: 10},
			},
			ResourceAIInteractionTurn: {
				QuotaPolicy: QuotaPolicy{
					Name:     "aiInteractionTurn:limit",
					Resource: ResourceAIInteractionTurn,
					Limit:    12000,
					Window:   quotaWindow,
				},
				QuotaUsage: QuotaUsage{Used: 300},
			},
			ResourceAIInteractionArchive: {
				QuotaPolicy: QuotaPolicy{
					Name:     "aiInteractionArchive:limit",
					Resource: ResourceAIInteractionArchive,
					Limit:    8000,
					Window:   quotaWindow,
				},
				QuotaUsage: QuotaUsage{Used: 400},
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

func TestNewContextWithUserQuotas(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		wantQuotas := newTestUserQuotas()
		ctx := NewContextWithUserQuotas(context.Background(), wantQuotas)

		quotas, ok := ctx.Value(userQuotasContextKey{}).(UserQuotas)
		require.True(t, ok)
		assert.Equal(t, wantQuotas, quotas)
	})

	t.Run("ZeroQuotas", func(t *testing.T) {
		ctx := NewContextWithUserQuotas(context.Background(), UserQuotas{})

		value := ctx.Value(userQuotasContextKey{})
		assert.Zero(t, value)
	})
}

func TestUserQuotasFromContext(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		wantQuotas := newTestUserQuotas()
		ctx := NewContextWithUserQuotas(context.Background(), wantQuotas)

		quotas, ok := UserQuotasFromContext(ctx)
		require.True(t, ok)
		assert.Equal(t, wantQuotas, quotas)
	})

	t.Run("NoQuotas", func(t *testing.T) {
		quotas, ok := UserQuotasFromContext(context.Background())
		require.False(t, ok)
		require.Zero(t, quotas)
	})

	t.Run("WrongContextValue", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), userQuotasContextKey{}, "not-quotas")

		quotas, ok := UserQuotasFromContext(ctx)
		require.False(t, ok)
		require.Zero(t, quotas)
	})
}
