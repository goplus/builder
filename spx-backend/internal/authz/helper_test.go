package authz

import (
	"context"
	"errors"
	"testing"

	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestCanManageAssets(t *testing.T) {
	t.Run("HasPermission", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{
			CanManageAssets:         true,
			CanUsePremiumLLM:        false,
			CopilotMessageQuota:     100,
			CopilotMessageQuotaLeft: 50,
		})

		result := CanManageAssets(ctx)
		assert.True(t, result)
	})

	t.Run("NoPermission", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{
			CanManageAssets:         false,
			CanUsePremiumLLM:        true,
			CopilotMessageQuota:     100,
			CopilotMessageQuotaLeft: 50,
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
			CanManageAssets:         false,
			CanManageCourses:        true,
			CanUsePremiumLLM:        false,
			CopilotMessageQuota:     100,
			CopilotMessageQuotaLeft: 50,
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
			CanManageAssets:         false,
			CanUsePremiumLLM:        true,
			CopilotMessageQuota:     1000,
			CopilotMessageQuotaLeft: 800,
		})

		result := CanUsePremiumLLM(ctx)
		assert.True(t, result)
	})

	t.Run("NoPermission", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{
			CanManageAssets:         true,
			CanUsePremiumLLM:        false,
			CopilotMessageQuota:     100,
			CopilotMessageQuotaLeft: 30,
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
		quotaTracker := &mockQuotaTracker{}
		quotaTracker.incrementUsageFunc = func(ctx context.Context, userID int64, resource Resource, amount int64) error {
			assert.Equal(t, int64(123), userID)
			assert.Equal(t, ResourceCopilotMessage, resource)
			assert.Equal(t, int64(2), amount)
			return nil
		}

		pdp := &mockPolicyDecisionPoint{}
		authorizer := New(&gorm.DB{}, pdp, quotaTracker)

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
		authorizer := New(&gorm.DB{}, pdp, quotaTracker)

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
		authorizer := New(&gorm.DB{}, pdp, quotaTracker)

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
