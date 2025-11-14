package authz

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestCanManageAssets(t *testing.T) {
	t.Run("HasPermission", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{
			CanManageAssets:  true,
			CanUsePremiumLLM: false,
		})

		result := CanManageAssets(ctx)
		assert.True(t, result)
	})

	t.Run("NoPermission", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{
			CanManageAssets:  false,
			CanUsePremiumLLM: true,
		})

		result := CanManageAssets(ctx)
		assert.False(t, result)
	})

	t.Run("NoCapabilities", func(t *testing.T) {
		ctx := context.Background()

		result := CanManageAssets(ctx)
		assert.False(t, result)
	})

	t.Run("WrongContextValue", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), userCapabilitiesContextKey{}, "not-capabilities")

		result := CanManageAssets(ctx)
		assert.False(t, result)
	})

	t.Run("ZeroCapabilities", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{})

		result := CanManageAssets(ctx)
		assert.False(t, result)
	})
}

func TestCanManageCourses(t *testing.T) {
	t.Run("HasPermission", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{
			CanManageAssets:  false,
			CanManageCourses: true,
			CanUsePremiumLLM: false,
		})

		result := CanManageCourses(ctx)
		assert.True(t, result)
	})

	t.Run("NoPermission", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{
			CanManageAssets:  true,
			CanManageCourses: false,
			CanUsePremiumLLM: true,
		})

		result := CanManageCourses(ctx)
		assert.False(t, result)
	})

	t.Run("NoCapabilities", func(t *testing.T) {
		ctx := context.Background()

		result := CanManageCourses(ctx)
		assert.False(t, result)
	})

	t.Run("WrongContextValue", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), userCapabilitiesContextKey{}, "not-capabilities")

		result := CanManageCourses(ctx)
		assert.False(t, result)
	})

	t.Run("ZeroCapabilities", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{})

		result := CanManageCourses(ctx)
		assert.False(t, result)
	})
}

func TestCanUsePremiumLLM(t *testing.T) {
	t.Run("HasPermission", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{
			CanManageAssets:  false,
			CanUsePremiumLLM: true,
		})

		result := CanUsePremiumLLM(ctx)
		assert.True(t, result)
	})

	t.Run("NoPermission", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{
			CanManageAssets:  true,
			CanUsePremiumLLM: false,
		})

		result := CanUsePremiumLLM(ctx)
		assert.False(t, result)
	})

	t.Run("NoCapabilities", func(t *testing.T) {
		ctx := context.Background()

		result := CanUsePremiumLLM(ctx)
		assert.False(t, result)
	})

	t.Run("WrongContextValue", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), userCapabilitiesContextKey{}, "not-capabilities")

		result := CanUsePremiumLLM(ctx)
		assert.False(t, result)
	})

	t.Run("ZeroCapabilities", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{})

		result := CanUsePremiumLLM(ctx)
		assert.False(t, result)
	})
}

func TestConsumeQuota(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		var policies []QuotaPolicy
		quotaTracker := &mockQuotaTracker{}
		quotaTracker.incrementUsageFunc = func(ctx context.Context, userID int64, policy QuotaPolicy, amount int64) error {
			policies = append(policies, policy)
			assert.Equal(t, int64(123), userID)
			assert.Equal(t, ResourceCopilotMessage, policy.Resource)
			assert.Equal(t, int64(2), amount)
			return nil
		}

		pdp := &mockPolicyDecisionPoint{}
		authorizer := New(&gorm.DB{}, pdp, quotaTracker)

		testUser := newTestUser()
		ctx := context.Background()
		ctx = authn.NewContextWithUser(ctx, testUser)
		ctx = newContextWithAuthorizer(ctx, authorizer)
		ctx = NewContextWithUserQuotas(ctx, UserQuotas{
			Limits: map[Resource]Quota{
				ResourceCopilotMessage: {
					QuotaPolicy: QuotaPolicy{
						Name:     "copilotMessage:limit",
						Resource: ResourceCopilotMessage,
						Limit:    100,
						Window:   24 * time.Hour,
					},
				},
				ResourceAIDescription: {
					QuotaPolicy: QuotaPolicy{
						Name:     "aiDescription:limit",
						Resource: ResourceAIDescription,
						Limit:    300,
						Window:   24 * time.Hour,
					},
				},
				ResourceAIInteractionTurn: {
					QuotaPolicy: QuotaPolicy{
						Name:     "aiInteractionTurn:limit",
						Resource: ResourceAIInteractionTurn,
						Limit:    12000,
						Window:   24 * time.Hour,
					},
				},
				ResourceAIInteractionArchive: {
					QuotaPolicy: QuotaPolicy{
						Name:     "aiInteractionArchive:limit",
						Resource: ResourceAIInteractionArchive,
						Limit:    8000,
						Window:   24 * time.Hour,
					},
				},
			},
			RateLimits: map[Resource][]Quota{
				ResourceCopilotMessage: {
					{
						QuotaPolicy: QuotaPolicy{
							Name:     "copilotMessage:rateLimit:1m",
							Resource: ResourceCopilotMessage,
							Limit:    30,
							Window:   time.Minute,
						},
					},
					{
						QuotaPolicy: QuotaPolicy{
							Name:     "copilotMessage:rateLimit:5m",
							Resource: ResourceCopilotMessage,
							Limit:    150,
							Window:   5 * time.Minute,
						},
					},
				},
			},
		})

		err := ConsumeQuota(ctx, ResourceCopilotMessage, 2)
		assert.NoError(t, err)
		assert.Len(t, policies, 3)
		assert.Equal(t, "copilotMessage:limit", policies[0].Name)
		assert.Equal(t, "copilotMessage:rateLimit:1m", policies[1].Name)
		assert.Equal(t, "copilotMessage:rateLimit:5m", policies[2].Name)
	})

	t.Run("RateLimitOnly", func(t *testing.T) {
		quotaTracker := &mockQuotaTracker{}
		count := 0
		quotaTracker.incrementUsageFunc = func(ctx context.Context, userID int64, policy QuotaPolicy, amount int64) error {
			count++
			return nil
		}

		pdp := &mockPolicyDecisionPoint{}
		authorizer := New(&gorm.DB{}, pdp, quotaTracker)

		testUser := newTestUser()
		ctx := context.Background()
		ctx = authn.NewContextWithUser(ctx, testUser)
		ctx = newContextWithAuthorizer(ctx, authorizer)
		ctx = NewContextWithUserQuotas(ctx, UserQuotas{
			RateLimits: map[Resource][]Quota{
				ResourceCopilotMessage: {
					{
						QuotaPolicy: QuotaPolicy{
							Name:     "copilotMessage:rateLimit:1m",
							Resource: ResourceCopilotMessage,
							Limit:    30,
							Window:   time.Minute,
						},
					},
				},
			},
		})

		err := ConsumeQuota(ctx, ResourceCopilotMessage, 1)
		assert.NoError(t, err)
		assert.Equal(t, 1, count)
	})

	t.Run("NoAuthorizer", func(t *testing.T) {
		testUser := newTestUser()
		ctx := context.Background()
		ctx = authn.NewContextWithUser(ctx, testUser)

		err := ConsumeQuota(ctx, ResourceCopilotMessage, 1)
		require.Error(t, err)
		assert.EqualError(t, err, "missing authorizer in context")
	})

	t.Run("NoUser", func(t *testing.T) {
		quotaTracker := &mockQuotaTracker{}
		pdp := &mockPolicyDecisionPoint{}
		authorizer := New(&gorm.DB{}, pdp, quotaTracker)

		ctx := context.Background()
		ctx = newContextWithAuthorizer(ctx, authorizer)

		err := ConsumeQuota(ctx, ResourceCopilotMessage, 1)
		require.Error(t, err)
		assert.EqualError(t, err, "missing authenticated user in context")
	})

	t.Run("QuotaTrackerError", func(t *testing.T) {
		quotaTracker := &mockQuotaTracker{}
		quotaTracker.incrementUsageFunc = func(ctx context.Context, userID int64, policy QuotaPolicy, amount int64) error {
			return errors.New("quota exceeded")
		}

		pdp := &mockPolicyDecisionPoint{}
		authorizer := New(&gorm.DB{}, pdp, quotaTracker)

		testUser := newTestUser()
		ctx := context.Background()
		ctx = authn.NewContextWithUser(ctx, testUser)
		ctx = newContextWithAuthorizer(ctx, authorizer)
		ctx = NewContextWithUserQuotas(ctx, UserQuotas{
			Limits: map[Resource]Quota{
				ResourceCopilotMessage: {
					QuotaPolicy: QuotaPolicy{
						Name:     "copilotMessage:limit",
						Resource: ResourceCopilotMessage,
						Limit:    100,
						Window:   24 * time.Hour,
					},
				},
				ResourceAIDescription: {
					QuotaPolicy: QuotaPolicy{
						Name:     "aiDescription:limit",
						Resource: ResourceAIDescription,
						Limit:    300,
						Window:   24 * time.Hour,
					},
				},
				ResourceAIInteractionTurn: {
					QuotaPolicy: QuotaPolicy{
						Name:     "aiInteractionTurn:limit",
						Resource: ResourceAIInteractionTurn,
						Limit:    12000,
						Window:   24 * time.Hour,
					},
				},
				ResourceAIInteractionArchive: {
					QuotaPolicy: QuotaPolicy{
						Name:     "aiInteractionArchive:limit",
						Resource: ResourceAIInteractionArchive,
						Limit:    8000,
						Window:   24 * time.Hour,
					},
				},
			},
		})

		err := ConsumeQuota(ctx, ResourceCopilotMessage, 1)
		require.Error(t, err)
		assert.EqualError(t, err, "quota exceeded")
	})

	t.Run("NoQuotas", func(t *testing.T) {
		quotaTracker := &mockQuotaTracker{}
		pdp := &mockPolicyDecisionPoint{}
		authorizer := New(&gorm.DB{}, pdp, quotaTracker)

		testUser := newTestUser()
		ctx := context.Background()
		ctx = authn.NewContextWithUser(ctx, testUser)
		ctx = newContextWithAuthorizer(ctx, authorizer)

		err := ConsumeQuota(ctx, ResourceCopilotMessage, 1)
		require.Error(t, err)
		assert.EqualError(t, err, "missing user quotas in context")
	})

	t.Run("WrongAuthorizerContextValue", func(t *testing.T) {
		testUser := newTestUser()
		ctx := context.Background()
		ctx = authn.NewContextWithUser(ctx, testUser)
		ctx = context.WithValue(ctx, authorizerContextKey{}, "not-authorizer")

		err := ConsumeQuota(ctx, ResourceCopilotMessage, 1)
		require.Error(t, err)
		assert.EqualError(t, err, "missing authorizer in context")
	})
}
