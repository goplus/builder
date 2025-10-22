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
			CanManageAssets:                 true,
			CanUsePremiumLLM:                false,
			CopilotMessageQuota:             100,
			CopilotMessageQuotaLeft:         50,
			CopilotMessageRateLimit:         30,
			CopilotMessageRateWindowSeconds: 60,
		})

		result := CanManageAssets(ctx)
		assert.True(t, result)
	})

	t.Run("NoPermission", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{
			CanManageAssets:                 false,
			CanUsePremiumLLM:                true,
			CopilotMessageQuota:             100,
			CopilotMessageQuotaLeft:         50,
			CopilotMessageRateLimit:         30,
			CopilotMessageRateWindowSeconds: 60,
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
			CanManageAssets:                 false,
			CanManageCourses:                true,
			CanUsePremiumLLM:                false,
			CopilotMessageQuota:             100,
			CopilotMessageQuotaLeft:         50,
			CopilotMessageRateLimit:         30,
			CopilotMessageRateWindowSeconds: 60,
		})

		result := CanManageCourses(ctx)
		assert.True(t, result)
	})

	t.Run("NoPermission", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{
			CanManageAssets:         true,
			CanManageCourses:        false,
			CanUsePremiumLLM:        true,
			CopilotMessageQuota:     100,
			CopilotMessageQuotaLeft: 50,
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
			CanManageAssets:                 false,
			CanUsePremiumLLM:                true,
			CopilotMessageQuota:             1000,
			CopilotMessageQuotaLeft:         800,
			CopilotMessageRateLimit:         30,
			CopilotMessageRateWindowSeconds: 60,
		})

		result := CanUsePremiumLLM(ctx)
		assert.True(t, result)
	})

	t.Run("NoPermission", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{
			CanManageAssets:                 true,
			CanUsePremiumLLM:                false,
			CopilotMessageQuota:             100,
			CopilotMessageQuotaLeft:         30,
			CopilotMessageRateLimit:         30,
			CopilotMessageRateWindowSeconds: 60,
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

func TestAllowRateLimit(t *testing.T) {
	t.Run("Allow", func(t *testing.T) {
		limiter := &mockRateLimiter{}
		quotaTracker := &mockQuotaTracker{}
		pdp := &mockPolicyDecisionPoint{}
		authorizer := New(&gorm.DB{}, pdp, quotaTracker, limiter)

		testUser := newTestUser()
		ctx := context.Background()
		ctx = authn.NewContextWithUser(ctx, testUser)
		ctx = newContextWithAuthorizer(ctx, authorizer)
		ctx = NewContextWithUserCapabilities(ctx, UserCapabilities{
			CopilotMessageRateLimit:         30,
			CopilotMessageRateWindowSeconds: 60,
		})

		allowed, retryAfter, err := AllowRateLimit(ctx, ResourceCopilotMessage)
		require.NoError(t, err)
		assert.True(t, allowed)
		assert.Zero(t, retryAfter)
	})

	t.Run("Denied", func(t *testing.T) {
		limiter := &mockRateLimiter{}
		limiter.allowFunc = func(ctx context.Context, userID int64, resource Resource, policy RatePolicy) (bool, time.Duration, error) {
			assert.Equal(t, ResourceCopilotMessage, resource)
			assert.Equal(t, int64(30), policy.Limit)
			return false, time.Second, nil
		}
		quotaTracker := &mockQuotaTracker{}
		pdp := &mockPolicyDecisionPoint{}
		authorizer := New(&gorm.DB{}, pdp, quotaTracker, limiter)

		testUser := newTestUser()
		ctx := context.Background()
		ctx = authn.NewContextWithUser(ctx, testUser)
		ctx = newContextWithAuthorizer(ctx, authorizer)
		ctx = NewContextWithUserCapabilities(ctx, UserCapabilities{
			CopilotMessageRateLimit:         30,
			CopilotMessageRateWindowSeconds: 60,
		})

		allowed, retryAfter, err := AllowRateLimit(ctx, ResourceCopilotMessage)
		require.NoError(t, err)
		assert.False(t, allowed)
		assert.Equal(t, time.Second, retryAfter)
	})

	t.Run("NoAuthorizer", func(t *testing.T) {
		testUser := newTestUser()
		ctx := context.Background()
		ctx = authn.NewContextWithUser(ctx, testUser)

		allowed, _, err := AllowRateLimit(ctx, ResourceCopilotMessage)
		require.Error(t, err)
		assert.False(t, allowed)
		assert.EqualError(t, err, "missing authorizer in context")
	})

	t.Run("NoUser", func(t *testing.T) {
		limiter := &mockRateLimiter{}
		quotaTracker := &mockQuotaTracker{}
		pdp := &mockPolicyDecisionPoint{}
		authorizer := New(&gorm.DB{}, pdp, quotaTracker, limiter)

		ctx := context.Background()
		ctx = newContextWithAuthorizer(ctx, authorizer)

		allowed, _, err := AllowRateLimit(ctx, ResourceCopilotMessage)
		require.Error(t, err)
		assert.False(t, allowed)
		assert.EqualError(t, err, "missing authenticated user in context")
	})
}

func TestConsumeQuota(t *testing.T) {
	t.Run("Normal", func(t *testing.T) {
		quotaTracker := &mockQuotaTracker{}
		quotaTracker.incrementUsageFunc = func(ctx context.Context, userID int64, resource Resource, amount int64) error {
			assert.Equal(t, int64(123), userID)
			assert.Equal(t, ResourceCopilotMessage, resource)
			assert.Equal(t, int64(2), amount)
			return nil
		}

		pdp := &mockPolicyDecisionPoint{}
		rateLimiter := &mockRateLimiter{}
		authorizer := New(&gorm.DB{}, pdp, quotaTracker, rateLimiter)

		testUser := newTestUser()
		ctx := context.Background()
		ctx = authn.NewContextWithUser(ctx, testUser)
		ctx = newContextWithAuthorizer(ctx, authorizer)

		err := ConsumeQuota(ctx, ResourceCopilotMessage, 2)
		assert.NoError(t, err)
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
		rateLimiter := &mockRateLimiter{}
		authorizer := New(&gorm.DB{}, pdp, quotaTracker, rateLimiter)

		ctx := context.Background()
		ctx = newContextWithAuthorizer(ctx, authorizer)

		err := ConsumeQuota(ctx, ResourceCopilotMessage, 1)
		require.Error(t, err)
		assert.EqualError(t, err, "missing authenticated user in context")
	})

	t.Run("QuotaTrackerError", func(t *testing.T) {
		quotaTracker := &mockQuotaTracker{}
		quotaTracker.incrementUsageFunc = func(ctx context.Context, userID int64, resource Resource, amount int64) error {
			return errors.New("quota exceeded")
		}

		pdp := &mockPolicyDecisionPoint{}
		rateLimiter := &mockRateLimiter{}
		authorizer := New(&gorm.DB{}, pdp, quotaTracker, rateLimiter)

		testUser := newTestUser()
		ctx := context.Background()
		ctx = authn.NewContextWithUser(ctx, testUser)
		ctx = newContextWithAuthorizer(ctx, authorizer)

		err := ConsumeQuota(ctx, ResourceCopilotMessage, 1)
		require.Error(t, err)
		assert.EqualError(t, err, "quota exceeded")
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
