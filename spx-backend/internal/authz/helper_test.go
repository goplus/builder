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
			CopilotMessageQuota: Quota{
				Limit:     100,
				Remaining: 50,
			},
		})

		result := CanManageAssets(ctx)
		assert.True(t, result)
	})

	t.Run("NoPermission", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{
			CanManageAssets:  false,
			CanUsePremiumLLM: true,
			CopilotMessageQuota: Quota{
				Limit:     100,
				Remaining: 50,
			},
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
			CopilotMessageQuota: Quota{
				Limit:     100,
				Remaining: 50,
			},
		})

		result := CanManageCourses(ctx)
		assert.True(t, result)
	})

	t.Run("NoPermission", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{
			CanManageAssets:  true,
			CanManageCourses: false,
			CanUsePremiumLLM: true,
			CopilotMessageQuota: Quota{
				Limit:     100,
				Remaining: 50,
			},
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
			CopilotMessageQuota: Quota{
				Limit:     1000,
				Remaining: 800,
			},
		})

		result := CanUsePremiumLLM(ctx)
		assert.True(t, result)
	})

	t.Run("NoPermission", func(t *testing.T) {
		ctx := NewContextWithUserCapabilities(context.Background(), UserCapabilities{
			CanManageAssets:  true,
			CanUsePremiumLLM: false,
			CopilotMessageQuota: Quota{
				Limit:     100,
				Remaining: 30,
			},
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
		quotaTracker.incrementUsageFunc = func(ctx context.Context, userID int64, resource Resource, amount int64, policy QuotaPolicy) error {
			assert.Equal(t, int64(123), userID)
			assert.Equal(t, ResourceCopilotMessage, resource)
			assert.Equal(t, int64(2), amount)
			assert.Equal(t, int64(100), policy.Limit)
			assert.Equal(t, 24*time.Hour, policy.Window)
			return nil
		}

		pdp := &mockPolicyDecisionPoint{}
		authorizer := New(&gorm.DB{}, pdp, quotaTracker)

		testUser := newTestUser()
		ctx := context.Background()
		ctx = authn.NewContextWithUser(ctx, testUser)
		ctx = newContextWithAuthorizer(ctx, authorizer)
		ctx = NewContextWithUserCapabilities(ctx, UserCapabilities{
			CopilotMessageQuota: Quota{
				Limit:  100,
				Window: int64(24 * 60 * 60),
			},
			AIDescriptionQuota: Quota{
				Window: int64(24 * 60 * 60),
			},
			AIInteractionTurnQuota: Quota{
				Window: int64(24 * 60 * 60),
			},
			AIInteractionArchiveQuota: Quota{
				Window: int64(24 * 60 * 60),
			},
		})

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
		quotaTracker.incrementUsageFunc = func(ctx context.Context, userID int64, resource Resource, amount int64, policy QuotaPolicy) error {
			return errors.New("quota exceeded")
		}

		pdp := &mockPolicyDecisionPoint{}
		authorizer := New(&gorm.DB{}, pdp, quotaTracker)

		testUser := newTestUser()
		ctx := context.Background()
		ctx = authn.NewContextWithUser(ctx, testUser)
		ctx = newContextWithAuthorizer(ctx, authorizer)
		ctx = NewContextWithUserCapabilities(ctx, UserCapabilities{
			CopilotMessageQuota: Quota{
				Limit:  100,
				Window: int64(24 * 60 * 60),
			},
			AIDescriptionQuota: Quota{
				Window: int64(24 * 60 * 60),
			},
			AIInteractionTurnQuota: Quota{
				Window: int64(24 * 60 * 60),
			},
			AIInteractionArchiveQuota: Quota{
				Window: int64(24 * 60 * 60),
			},
		})

		err := ConsumeQuota(ctx, ResourceCopilotMessage, 1)
		require.Error(t, err)
		assert.EqualError(t, err, "quota exceeded")
	})

	t.Run("NoCapabilities", func(t *testing.T) {
		quotaTracker := &mockQuotaTracker{}
		pdp := &mockPolicyDecisionPoint{}
		authorizer := New(&gorm.DB{}, pdp, quotaTracker)

		testUser := newTestUser()
		ctx := context.Background()
		ctx = authn.NewContextWithUser(ctx, testUser)
		ctx = newContextWithAuthorizer(ctx, authorizer)

		err := ConsumeQuota(ctx, ResourceCopilotMessage, 1)
		require.Error(t, err)
		assert.EqualError(t, err, "missing user capabilities in context")
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

func TestQuotaPolicyFromUserCapabilities(t *testing.T) {
	const windowSeconds = int64(24 * 60 * 60)
	caps := UserCapabilities{
		CopilotMessageQuota: Quota{
			Limit:  100,
			Window: windowSeconds,
		},
		AIDescriptionQuota: Quota{
			Limit:  300,
			Window: windowSeconds,
		},
		AIInteractionTurnQuota: Quota{
			Limit:  12000,
			Window: windowSeconds,
		},
		AIInteractionArchiveQuota: Quota{
			Limit:  8000,
			Window: windowSeconds,
		},
	}

	for _, tt := range []struct {
		name     string
		resource Resource
		want     QuotaPolicy
	}{
		{
			name:     "Copilot",
			resource: ResourceCopilotMessage,
			want:     QuotaPolicy{Limit: 100, Window: 24 * time.Hour},
		},
		{
			name:     "AIDescription",
			resource: ResourceAIDescription,
			want:     QuotaPolicy{Limit: 300, Window: 24 * time.Hour},
		},
		{
			name:     "AIInteractionTurn",
			resource: ResourceAIInteractionTurn,
			want:     QuotaPolicy{Limit: 12000, Window: 24 * time.Hour},
		},
		{
			name:     "AIInteractionArchive",
			resource: ResourceAIInteractionArchive,
			want:     QuotaPolicy{Limit: 8000, Window: 24 * time.Hour},
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got, err := quotaPolicyFromUserCapabilities(tt.resource, caps)
			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}

	t.Run("UnsupportedResource", func(t *testing.T) {
		_, err := quotaPolicyFromUserCapabilities(Resource("unknown"), caps)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "unsupported quota resource")
	})
}
