package embpdp

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockQuotaTracker struct {
	usage map[string]authz.QuotaUsage
}

func newMockQuotaTracker() *mockQuotaTracker {
	return &mockQuotaTracker{usage: make(map[string]authz.QuotaUsage)}
}

func (m *mockQuotaTracker) Usage(ctx context.Context, userID int64, resource authz.Resource) (authz.QuotaUsage, error) {
	key := fmt.Sprintf("%d:%s", userID, resource)
	return m.usage[key], nil
}

func (m *mockQuotaTracker) IncrementUsage(ctx context.Context, userID int64, resource authz.Resource, amount int64, policy authz.QuotaPolicy) error {
	key := fmt.Sprintf("%d:%s", userID, resource)
	entry := m.usage[key]
	entry.Used += amount
	if policy.Window > 0 {
		entry.ResetTime = time.Now().Add(policy.Window)
	}
	m.usage[key] = entry
	return nil
}

func (m *mockQuotaTracker) ResetUsage(ctx context.Context, userID int64, resource authz.Resource) error {
	key := fmt.Sprintf("%d:%s", userID, resource)
	m.usage[key] = authz.QuotaUsage{}
	return nil
}

func TestNew(t *testing.T) {
	quotaTracker := newMockQuotaTracker()
	pdp := New(quotaTracker)

	require.NotNil(t, pdp)
}

func TestEmbeddedPDPComputeUserCapabilities(t *testing.T) {
	t.Run("Basic", func(t *testing.T) {
		for _, tt := range []struct {
			name                                string
			mUser                               *model.User
			wantCanManageAssets                 bool
			wantCanManageCourses                bool
			wantCanUsePremiumLLM                bool
			wantCopilotMessageQuotaLimit        int64
			wantCopilotMessageQuotaWindow       int64
			wantAIDescriptionQuotaLimit         int64
			wantAIDescriptionQuotaWindow        int64
			wantAIInteractionTurnQuotaLimit     int64
			wantAIInteractionTurnQuotaWindow    int64
			wantAIInteractionArchiveQuotaLimit  int64
			wantAIInteractionArchiveQuotaWindow int64
		}{
			{
				name: "AssetAdminWithPlusPlan",
				mUser: &model.User{
					Model:    model.Model{ID: 1},
					Username: "admin-user",
					Roles:    model.UserRoles{"assetAdmin"},
					Plan:     model.UserPlanPlus,
				},
				wantCanManageAssets:                 true,
				wantCanManageCourses:                false,
				wantCanUsePremiumLLM:                true,
				wantCopilotMessageQuotaLimit:        copilotQuotaLimitPlus,
				wantCopilotMessageQuotaWindow:       quotaWindow,
				wantAIDescriptionQuotaLimit:         aiDescriptionQuotaLimitPlus,
				wantAIDescriptionQuotaWindow:        quotaWindow,
				wantAIInteractionTurnQuotaLimit:     aiInteractionTurnQuotaLimitPlus,
				wantAIInteractionTurnQuotaWindow:    quotaWindow,
				wantAIInteractionArchiveQuotaLimit:  aiInteractionArchiveQuotaLimitPlus,
				wantAIInteractionArchiveQuotaWindow: quotaWindow,
			},
			{
				name: "RegularPlusUser",
				mUser: &model.User{
					Model:    model.Model{ID: 2},
					Username: "plus-user",
					Roles:    nil,
					Plan:     model.UserPlanPlus,
				},
				wantCanManageAssets:                 false,
				wantCanManageCourses:                false,
				wantCanUsePremiumLLM:                true,
				wantCopilotMessageQuotaLimit:        copilotQuotaLimitPlus,
				wantCopilotMessageQuotaWindow:       quotaWindow,
				wantAIDescriptionQuotaLimit:         aiDescriptionQuotaLimitPlus,
				wantAIDescriptionQuotaWindow:        quotaWindow,
				wantAIInteractionTurnQuotaLimit:     aiInteractionTurnQuotaLimitPlus,
				wantAIInteractionTurnQuotaWindow:    quotaWindow,
				wantAIInteractionArchiveQuotaLimit:  aiInteractionArchiveQuotaLimitPlus,
				wantAIInteractionArchiveQuotaWindow: quotaWindow,
			},
			{
				name: "RegularFreeUser",
				mUser: &model.User{
					Model:    model.Model{ID: 3},
					Username: "free-user",
					Roles:    nil,
					Plan:     model.UserPlanFree,
				},
				wantCanManageAssets:                 false,
				wantCanManageCourses:                false,
				wantCanUsePremiumLLM:                false,
				wantCopilotMessageQuotaLimit:        copilotQuotaLimitFree,
				wantCopilotMessageQuotaWindow:       quotaWindow,
				wantAIDescriptionQuotaLimit:         aiDescriptionQuotaLimitFree,
				wantAIDescriptionQuotaWindow:        quotaWindow,
				wantAIInteractionTurnQuotaLimit:     aiInteractionTurnQuotaLimitFree,
				wantAIInteractionTurnQuotaWindow:    quotaWindow,
				wantAIInteractionArchiveQuotaLimit:  aiInteractionArchiveQuotaLimitFree,
				wantAIInteractionArchiveQuotaWindow: quotaWindow,
			},
			{
				name: "AdminWithFreePlan",
				mUser: &model.User{
					Model:    model.Model{ID: 4},
					Username: "admin-free-user",
					Roles:    model.UserRoles{"admin"},
					Plan:     model.UserPlanFree,
				},
				wantCanManageAssets:                 false,
				wantCanManageCourses:                false,
				wantCanUsePremiumLLM:                false,
				wantCopilotMessageQuotaLimit:        copilotQuotaLimitFree,
				wantCopilotMessageQuotaWindow:       quotaWindow,
				wantAIDescriptionQuotaLimit:         aiDescriptionQuotaLimitFree,
				wantAIDescriptionQuotaWindow:        quotaWindow,
				wantAIInteractionTurnQuotaLimit:     aiInteractionTurnQuotaLimitFree,
				wantAIInteractionTurnQuotaWindow:    quotaWindow,
				wantAIInteractionArchiveQuotaLimit:  aiInteractionArchiveQuotaLimitFree,
				wantAIInteractionArchiveQuotaWindow: quotaWindow,
			},
			{
				name: "UserWithMultipleRoles",
				mUser: &model.User{
					Model:    model.Model{ID: 5},
					Username: "multi-role-user",
					Roles:    model.UserRoles{"user", "assetAdmin"},
					Plan:     model.UserPlanFree,
				},
				wantCanManageAssets:                 true,
				wantCanManageCourses:                false,
				wantCanUsePremiumLLM:                false,
				wantCopilotMessageQuotaLimit:        copilotQuotaLimitFree,
				wantCopilotMessageQuotaWindow:       quotaWindow,
				wantAIDescriptionQuotaLimit:         aiDescriptionQuotaLimitFree,
				wantAIDescriptionQuotaWindow:        quotaWindow,
				wantAIInteractionTurnQuotaLimit:     aiInteractionTurnQuotaLimitFree,
				wantAIInteractionTurnQuotaWindow:    quotaWindow,
				wantAIInteractionArchiveQuotaLimit:  aiInteractionArchiveQuotaLimitFree,
				wantAIInteractionArchiveQuotaWindow: quotaWindow,
			},
			{
				name: "CourseAdminUser",
				mUser: &model.User{
					Model:    model.Model{ID: 6},
					Username: "course-admin-user",
					Roles:    model.UserRoles{"courseAdmin"},
					Plan:     model.UserPlanFree,
				},
				wantCanManageAssets:                 false,
				wantCanManageCourses:                true,
				wantCanUsePremiumLLM:                false,
				wantCopilotMessageQuotaLimit:        copilotQuotaLimitFree,
				wantCopilotMessageQuotaWindow:       quotaWindow,
				wantAIDescriptionQuotaLimit:         aiDescriptionQuotaLimitFree,
				wantAIDescriptionQuotaWindow:        quotaWindow,
				wantAIInteractionTurnQuotaLimit:     aiInteractionTurnQuotaLimitFree,
				wantAIInteractionTurnQuotaWindow:    quotaWindow,
				wantAIInteractionArchiveQuotaLimit:  aiInteractionArchiveQuotaLimitFree,
				wantAIInteractionArchiveQuotaWindow: quotaWindow,
			},
			{
				name: "UserWithMultipleAdminRoles",
				mUser: &model.User{
					Model:    model.Model{ID: 7},
					Username: "multi-admin-user",
					Roles:    model.UserRoles{"assetAdmin", "courseAdmin"},
					Plan:     model.UserPlanPlus,
				},
				wantCanManageAssets:                 true,
				wantCanManageCourses:                true,
				wantCanUsePremiumLLM:                true,
				wantCopilotMessageQuotaLimit:        copilotQuotaLimitPlus,
				wantCopilotMessageQuotaWindow:       quotaWindow,
				wantAIDescriptionQuotaLimit:         aiDescriptionQuotaLimitPlus,
				wantAIDescriptionQuotaWindow:        quotaWindow,
				wantAIInteractionTurnQuotaLimit:     aiInteractionTurnQuotaLimitPlus,
				wantAIInteractionTurnQuotaWindow:    quotaWindow,
				wantAIInteractionArchiveQuotaLimit:  aiInteractionArchiveQuotaLimitPlus,
				wantAIInteractionArchiveQuotaWindow: quotaWindow,
			},
		} {
			t.Run(tt.name, func(t *testing.T) {
				quotaTracker := newMockQuotaTracker()
				pdp := New(quotaTracker)

				caps, err := pdp.ComputeUserCapabilities(context.Background(), tt.mUser)
				require.NoError(t, err)
				assert.Equal(t, tt.wantCanManageAssets, caps.CanManageAssets)
				assert.Equal(t, tt.wantCanManageCourses, caps.CanManageCourses)
				assert.Equal(t, tt.wantCanUsePremiumLLM, caps.CanUsePremiumLLM)
				assert.Equal(t, tt.wantCopilotMessageQuotaLimit, caps.CopilotMessageQuota.Limit)
				assert.Equal(t, tt.wantCopilotMessageQuotaWindow, caps.CopilotMessageQuota.Window)
				assert.Equal(t, caps.CopilotMessageQuota.Limit, caps.CopilotMessageQuota.Remaining)
				assert.Equal(t, caps.CopilotMessageQuota.Window, caps.CopilotMessageQuota.Reset())
				assert.Equal(t, tt.wantAIDescriptionQuotaLimit, caps.AIDescriptionQuota.Limit)
				assert.Equal(t, tt.wantAIDescriptionQuotaWindow, caps.AIDescriptionQuota.Window)
				assert.Equal(t, caps.AIDescriptionQuota.Limit, caps.AIDescriptionQuota.Remaining)
				assert.Equal(t, caps.AIDescriptionQuota.Window, caps.AIDescriptionQuota.Reset())
				assert.Equal(t, tt.wantAIInteractionTurnQuotaLimit, caps.AIInteractionTurnQuota.Limit)
				assert.Equal(t, tt.wantAIInteractionTurnQuotaWindow, caps.AIInteractionTurnQuota.Window)
				assert.Equal(t, caps.AIInteractionTurnQuota.Limit, caps.AIInteractionTurnQuota.Remaining)
				assert.Equal(t, caps.AIInteractionTurnQuota.Window, caps.AIInteractionTurnQuota.Reset())
				assert.Equal(t, tt.wantAIInteractionArchiveQuotaLimit, caps.AIInteractionArchiveQuota.Limit)
				assert.Equal(t, tt.wantAIInteractionArchiveQuotaWindow, caps.AIInteractionArchiveQuota.Window)
				assert.Equal(t, caps.AIInteractionArchiveQuota.Limit, caps.AIInteractionArchiveQuota.Remaining)
				assert.Equal(t, caps.AIInteractionArchiveQuota.Window, caps.AIInteractionArchiveQuota.Reset())
			})
		}
	})

	t.Run("WithQuotaUsage", func(t *testing.T) {
		quotaTracker := newMockQuotaTracker()
		pdp := New(quotaTracker)

		mUser := &model.User{
			Model:    model.Model{ID: 1},
			Username: "test-user",
			Roles:    nil,
			Plan:     model.UserPlanFree,
		}

		window := quotaWindow * time.Second

		err := quotaTracker.IncrementUsage(
			context.Background(),
			mUser.ID,
			authz.ResourceCopilotMessage,
			30,
			authz.QuotaPolicy{Limit: copilotQuotaLimitFree, Window: window},
		)
		require.NoError(t, err)
		err = quotaTracker.IncrementUsage(
			context.Background(),
			mUser.ID,
			authz.ResourceAIDescription,
			5,
			authz.QuotaPolicy{Limit: aiDescriptionQuotaLimitFree, Window: window},
		)
		require.NoError(t, err)
		err = quotaTracker.IncrementUsage(
			context.Background(),
			mUser.ID,
			authz.ResourceAIInteractionTurn,
			120,
			authz.QuotaPolicy{Limit: aiInteractionTurnQuotaLimitFree, Window: window},
		)
		require.NoError(t, err)
		err = quotaTracker.IncrementUsage(
			context.Background(),
			mUser.ID,
			authz.ResourceAIInteractionArchive,
			10,
			authz.QuotaPolicy{Limit: aiInteractionArchiveQuotaLimitFree, Window: window},
		)
		require.NoError(t, err)

		caps, err := pdp.ComputeUserCapabilities(context.Background(), mUser)
		require.NoError(t, err)
		assert.Equal(t, false, caps.CanManageAssets)
		assert.Equal(t, false, caps.CanManageCourses)
		assert.Equal(t, false, caps.CanUsePremiumLLM)
		assert.Equal(t, int64(copilotQuotaLimitFree), caps.CopilotMessageQuota.Limit)
		assert.Equal(t, int64(quotaWindow), caps.CopilotMessageQuota.Window)
		assert.Equal(t, int64(copilotQuotaLimitFree-30), caps.CopilotMessageQuota.Remaining)
		assert.Equal(t, int64(quotaWindow), caps.CopilotMessageQuota.Reset())
		assert.Equal(t, int64(aiDescriptionQuotaLimitFree), caps.AIDescriptionQuota.Limit)
		assert.Equal(t, int64(quotaWindow), caps.AIDescriptionQuota.Window)
		assert.Equal(t, int64(aiDescriptionQuotaLimitFree-5), caps.AIDescriptionQuota.Remaining)
		assert.Equal(t, int64(quotaWindow), caps.AIDescriptionQuota.Reset())
		assert.Equal(t, int64(aiInteractionTurnQuotaLimitFree), caps.AIInteractionTurnQuota.Limit)
		assert.Equal(t, int64(quotaWindow), caps.AIInteractionTurnQuota.Window)
		assert.Equal(t, int64(aiInteractionTurnQuotaLimitFree-120), caps.AIInteractionTurnQuota.Remaining)
		assert.Equal(t, int64(quotaWindow), caps.AIInteractionTurnQuota.Reset())
		assert.Equal(t, int64(aiInteractionArchiveQuotaLimitFree), caps.AIInteractionArchiveQuota.Limit)
		assert.Equal(t, int64(quotaWindow), caps.AIInteractionArchiveQuota.Window)
		assert.Equal(t, int64(aiInteractionArchiveQuotaLimitFree-10), caps.AIInteractionArchiveQuota.Remaining)
		assert.Equal(t, int64(quotaWindow), caps.AIInteractionArchiveQuota.Reset())
	})

	t.Run("QuotaExceeded", func(t *testing.T) {
		quotaTracker := newMockQuotaTracker()
		pdp := New(quotaTracker)

		mUser := &model.User{
			Model:    model.Model{ID: 1},
			Username: "test-user",
			Roles:    nil,
			Plan:     model.UserPlanFree,
		}

		window := quotaWindow * time.Second

		err := quotaTracker.IncrementUsage(
			context.Background(),
			mUser.ID,
			authz.ResourceCopilotMessage,
			copilotQuotaLimitFree+50,
			authz.QuotaPolicy{Limit: copilotQuotaLimitFree, Window: window},
		)
		require.NoError(t, err)
		err = quotaTracker.IncrementUsage(
			context.Background(),
			mUser.ID,
			authz.ResourceAIDescription,
			aiDescriptionQuotaLimitFree+100,
			authz.QuotaPolicy{Limit: aiDescriptionQuotaLimitFree, Window: window},
		)
		require.NoError(t, err)
		err = quotaTracker.IncrementUsage(
			context.Background(),
			mUser.ID,
			authz.ResourceAIInteractionTurn,
			aiInteractionTurnQuotaLimitFree+5000,
			authz.QuotaPolicy{Limit: aiInteractionTurnQuotaLimitFree, Window: window},
		)
		require.NoError(t, err)
		err = quotaTracker.IncrementUsage(
			context.Background(),
			mUser.ID,
			authz.ResourceAIInteractionArchive,
			aiInteractionArchiveQuotaLimitFree+3000,
			authz.QuotaPolicy{Limit: aiInteractionArchiveQuotaLimitFree, Window: window},
		)
		require.NoError(t, err)

		caps, err := pdp.ComputeUserCapabilities(context.Background(), mUser)
		require.NoError(t, err)
		assert.Equal(t, int64(copilotQuotaLimitFree), caps.CopilotMessageQuota.Limit)
		assert.Equal(t, int64(quotaWindow), caps.CopilotMessageQuota.Window)
		assert.Equal(t, int64(0), caps.CopilotMessageQuota.Remaining)
		assert.Equal(t, int64(quotaWindow), caps.CopilotMessageQuota.Reset())
		assert.Equal(t, int64(aiDescriptionQuotaLimitFree), caps.AIDescriptionQuota.Limit)
		assert.Equal(t, int64(quotaWindow), caps.AIDescriptionQuota.Window)
		assert.Equal(t, int64(0), caps.AIDescriptionQuota.Remaining)
		assert.Equal(t, int64(quotaWindow), caps.AIDescriptionQuota.Reset())
		assert.Equal(t, int64(aiInteractionTurnQuotaLimitFree), caps.AIInteractionTurnQuota.Limit)
		assert.Equal(t, int64(quotaWindow), caps.AIInteractionTurnQuota.Window)
		assert.Equal(t, int64(0), caps.AIInteractionTurnQuota.Remaining)
		assert.Equal(t, int64(quotaWindow), caps.AIInteractionTurnQuota.Reset())
		assert.Equal(t, int64(aiInteractionArchiveQuotaLimitFree), caps.AIInteractionArchiveQuota.Limit)
		assert.Equal(t, int64(quotaWindow), caps.AIInteractionArchiveQuota.Window)
		assert.Equal(t, int64(0), caps.AIInteractionArchiveQuota.Remaining)
		assert.Equal(t, int64(quotaWindow), caps.AIInteractionArchiveQuota.Reset())
	})
}

func TestQuotaRemaining(t *testing.T) {
	for _, tt := range []struct {
		name  string
		limit int64
		usage authz.QuotaUsage
		want  int64
	}{
		{
			name:  "WithinLimit",
			limit: 100,
			usage: authz.QuotaUsage{Used: 20},
			want:  80,
		},
		{
			name:  "ExceedsLimit",
			limit: 50,
			usage: authz.QuotaUsage{Used: 80},
			want:  0,
		},
		{
			name:  "Unlimited",
			limit: 0,
			usage: authz.QuotaUsage{Used: 0},
			want:  0,
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got := quotaRemaining(tt.limit, tt.usage)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestQuotaResetTime(t *testing.T) {
	t.Run("TrackerProvidesReset", func(t *testing.T) {
		resetAt := time.Now().Add(120 * time.Second)
		usage := authz.QuotaUsage{
			Used:      10,
			ResetTime: resetAt,
		}
		got := quotaResetTime(86400, usage)
		require.True(t, got.Equal(resetAt))
	})

	t.Run("FreshWindowDefaultsToWindow", func(t *testing.T) {
		const window = int64(3600)
		usage := authz.QuotaUsage{Used: 0}
		got := quotaResetTime(window, usage)
		require.False(t, got.IsZero())

		remaining := time.Until(got)
		require.Greater(t, remaining, 0*time.Second)

		expected := time.Duration(window) * time.Second
		assert.InDelta(t, float64(expected), float64(remaining), float64(time.Second))
	})

	t.Run("NoResetInfo", func(t *testing.T) {
		usage := authz.QuotaUsage{Used: 100}
		got := quotaResetTime(3600, usage)
		assert.True(t, got.IsZero())
	})
}
