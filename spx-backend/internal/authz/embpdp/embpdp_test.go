package embpdp

import (
	"context"
	"fmt"
	"testing"

	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockQuotaTracker struct {
	usage map[string]int64
}

func newMockQuotaTracker() *mockQuotaTracker {
	return &mockQuotaTracker{usage: make(map[string]int64)}
}

func (m *mockQuotaTracker) Usage(ctx context.Context, userID int64, resource authz.Resource) (int64, error) {
	key := fmt.Sprintf("%d:%s", userID, resource)
	return m.usage[key], nil
}

func (m *mockQuotaTracker) IncrementUsage(ctx context.Context, userID int64, resource authz.Resource, amount int64) error {
	key := fmt.Sprintf("%d:%s", userID, resource)
	m.usage[key] += amount
	return nil
}

func (m *mockQuotaTracker) ResetUsage(ctx context.Context, userID int64, resource authz.Resource) error {
	key := fmt.Sprintf("%d:%s", userID, resource)
	m.usage[key] = 0
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
			name                              string
			mUser                             *model.User
			wantCanManageAssets               bool
			wantCanManageCourses              bool
			wantCanUsePremiumLLM              bool
			wantCopilotMessageQuota           int64
			wantCopilotRateLimit              int64
			wantAIDescriptionQuota            int64
			wantAIDescriptionRateLimit        int64
			wantAIInteractionTurnQuota        int64
			wantAIInteractionTurnRateLimit    int64
			wantAIInteractionArchiveQuota     int64
			wantAIInteractionArchiveRateLimit int64
		}{
			{
				name: "AssetAdminWithPlusPlan",
				mUser: &model.User{
					Model:    model.Model{ID: 1},
					Username: "admin-user",
					Roles:    model.UserRoles{"assetAdmin"},
					Plan:     model.UserPlanPlus,
				},
				wantCanManageAssets:               true,
				wantCanManageCourses:              false,
				wantCanUsePremiumLLM:              true,
				wantCopilotMessageQuota:           copilotQuotaPlus,
				wantCopilotRateLimit:              copilotRateLimitPlus,
				wantAIDescriptionQuota:            aiDescriptionQuotaPlus,
				wantAIDescriptionRateLimit:        aiDescriptionRateLimitPlus,
				wantAIInteractionTurnQuota:        aiInteractionTurnQuotaPlus,
				wantAIInteractionTurnRateLimit:    aiInteractionTurnRateLimitPlus,
				wantAIInteractionArchiveQuota:     aiInteractionArchiveQuotaPlus,
				wantAIInteractionArchiveRateLimit: aiInteractionArchiveRateLimitPlus,
			},
			{
				name: "RegularPlusUser",
				mUser: &model.User{
					Model:    model.Model{ID: 2},
					Username: "plus-user",
					Roles:    nil,
					Plan:     model.UserPlanPlus,
				},
				wantCanManageAssets:               false,
				wantCanManageCourses:              false,
				wantCanUsePremiumLLM:              true,
				wantCopilotMessageQuota:           copilotQuotaPlus,
				wantCopilotRateLimit:              copilotRateLimitPlus,
				wantAIDescriptionQuota:            aiDescriptionQuotaPlus,
				wantAIDescriptionRateLimit:        aiDescriptionRateLimitPlus,
				wantAIInteractionTurnQuota:        aiInteractionTurnQuotaPlus,
				wantAIInteractionTurnRateLimit:    aiInteractionTurnRateLimitPlus,
				wantAIInteractionArchiveQuota:     aiInteractionArchiveQuotaPlus,
				wantAIInteractionArchiveRateLimit: aiInteractionArchiveRateLimitPlus,
			},
			{
				name: "RegularFreeUser",
				mUser: &model.User{
					Model:    model.Model{ID: 3},
					Username: "free-user",
					Roles:    nil,
					Plan:     model.UserPlanFree,
				},
				wantCanManageAssets:               false,
				wantCanManageCourses:              false,
				wantCanUsePremiumLLM:              false,
				wantCopilotMessageQuota:           copilotQuotaFree,
				wantCopilotRateLimit:              copilotRateLimitFree,
				wantAIDescriptionQuota:            aiDescriptionQuotaFree,
				wantAIDescriptionRateLimit:        aiDescriptionRateLimitFree,
				wantAIInteractionTurnQuota:        aiInteractionTurnQuotaFree,
				wantAIInteractionTurnRateLimit:    aiInteractionTurnRateLimitFree,
				wantAIInteractionArchiveQuota:     aiInteractionArchiveQuotaFree,
				wantAIInteractionArchiveRateLimit: aiInteractionArchiveRateLimitFree,
			},
			{
				name: "AdminWithFreePlan",
				mUser: &model.User{
					Model:    model.Model{ID: 4},
					Username: "admin-free-user",
					Roles:    model.UserRoles{"admin"},
					Plan:     model.UserPlanFree,
				},
				wantCanManageAssets:               false,
				wantCanManageCourses:              false,
				wantCanUsePremiumLLM:              false,
				wantCopilotMessageQuota:           copilotQuotaFree,
				wantCopilotRateLimit:              copilotRateLimitFree,
				wantAIDescriptionQuota:            aiDescriptionQuotaFree,
				wantAIDescriptionRateLimit:        aiDescriptionRateLimitFree,
				wantAIInteractionTurnQuota:        aiInteractionTurnQuotaFree,
				wantAIInteractionTurnRateLimit:    aiInteractionTurnRateLimitFree,
				wantAIInteractionArchiveQuota:     aiInteractionArchiveQuotaFree,
				wantAIInteractionArchiveRateLimit: aiInteractionArchiveRateLimitFree,
			},
			{
				name: "UserWithMultipleRoles",
				mUser: &model.User{
					Model:    model.Model{ID: 5},
					Username: "multi-role-user",
					Roles:    model.UserRoles{"user", "assetAdmin"},
					Plan:     model.UserPlanFree,
				},
				wantCanManageAssets:               true,
				wantCanManageCourses:              false,
				wantCanUsePremiumLLM:              false,
				wantCopilotMessageQuota:           copilotQuotaFree,
				wantCopilotRateLimit:              copilotRateLimitFree,
				wantAIDescriptionQuota:            aiDescriptionQuotaFree,
				wantAIDescriptionRateLimit:        aiDescriptionRateLimitFree,
				wantAIInteractionTurnQuota:        aiInteractionTurnQuotaFree,
				wantAIInteractionTurnRateLimit:    aiInteractionTurnRateLimitFree,
				wantAIInteractionArchiveQuota:     aiInteractionArchiveQuotaFree,
				wantAIInteractionArchiveRateLimit: aiInteractionArchiveRateLimitFree,
			},
			{
				name: "CourseAdminUser",
				mUser: &model.User{
					Model:    model.Model{ID: 6},
					Username: "course-admin-user",
					Roles:    model.UserRoles{"courseAdmin"},
					Plan:     model.UserPlanFree,
				},
				wantCanManageAssets:               false,
				wantCanManageCourses:              true,
				wantCanUsePremiumLLM:              false,
				wantCopilotMessageQuota:           copilotQuotaFree,
				wantCopilotRateLimit:              copilotRateLimitFree,
				wantAIDescriptionQuota:            aiDescriptionQuotaFree,
				wantAIDescriptionRateLimit:        aiDescriptionRateLimitFree,
				wantAIInteractionTurnQuota:        aiInteractionTurnQuotaFree,
				wantAIInteractionTurnRateLimit:    aiInteractionTurnRateLimitFree,
				wantAIInteractionArchiveQuota:     aiInteractionArchiveQuotaFree,
				wantAIInteractionArchiveRateLimit: aiInteractionArchiveRateLimitFree,
			},
			{
				name: "UserWithMultipleAdminRoles",
				mUser: &model.User{
					Model:    model.Model{ID: 7},
					Username: "multi-admin-user",
					Roles:    model.UserRoles{"assetAdmin", "courseAdmin"},
					Plan:     model.UserPlanPlus,
				},
				wantCanManageAssets:               true,
				wantCanManageCourses:              true,
				wantCanUsePremiumLLM:              true,
				wantCopilotMessageQuota:           copilotQuotaPlus,
				wantCopilotRateLimit:              copilotRateLimitPlus,
				wantAIDescriptionQuota:            aiDescriptionQuotaPlus,
				wantAIDescriptionRateLimit:        aiDescriptionRateLimitPlus,
				wantAIInteractionTurnQuota:        aiInteractionTurnQuotaPlus,
				wantAIInteractionTurnRateLimit:    aiInteractionTurnRateLimitPlus,
				wantAIInteractionArchiveQuota:     aiInteractionArchiveQuotaPlus,
				wantAIInteractionArchiveRateLimit: aiInteractionArchiveRateLimitPlus,
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
				assert.Equal(t, tt.wantCopilotMessageQuota, caps.CopilotMessageQuota)
				assert.Equal(t, caps.CopilotMessageQuota, caps.CopilotMessageQuotaLeft)
				assert.Equal(t, tt.wantCopilotRateLimit, caps.CopilotMessageRateLimit)
				assert.Equal(t, int64(rateWindowSeconds), caps.CopilotMessageRateWindowSeconds)
				assert.Equal(t, tt.wantAIDescriptionQuota, caps.AIDescriptionQuota)
				assert.Equal(t, caps.AIDescriptionQuota, caps.AIDescriptionQuotaLeft)
				assert.Equal(t, tt.wantAIDescriptionRateLimit, caps.AIDescriptionRateLimit)
				assert.Equal(t, int64(rateWindowSeconds), caps.AIDescriptionRateWindowSeconds)
				assert.Equal(t, tt.wantAIInteractionTurnQuota, caps.AIInteractionTurnQuota)
				assert.Equal(t, caps.AIInteractionTurnQuota, caps.AIInteractionTurnQuotaLeft)
				assert.Equal(t, tt.wantAIInteractionTurnRateLimit, caps.AIInteractionTurnRateLimit)
				assert.Equal(t, int64(rateWindowSeconds), caps.AIInteractionTurnRateWindowSeconds)
				assert.Equal(t, tt.wantAIInteractionArchiveQuota, caps.AIInteractionArchiveQuota)
				assert.Equal(t, caps.AIInteractionArchiveQuota, caps.AIInteractionArchiveQuotaLeft)
				assert.Equal(t, tt.wantAIInteractionArchiveRateLimit, caps.AIInteractionArchiveRateLimit)
				assert.Equal(t, int64(rateWindowSeconds), caps.AIInteractionArchiveRateWindowSeconds)
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

		err := quotaTracker.IncrementUsage(context.Background(), mUser.ID, authz.ResourceCopilotMessage, 30)
		require.NoError(t, err)
		err = quotaTracker.IncrementUsage(context.Background(), mUser.ID, authz.ResourceAIDescription, 5)
		require.NoError(t, err)
		err = quotaTracker.IncrementUsage(context.Background(), mUser.ID, authz.ResourceAIInteractionTurn, 120)
		require.NoError(t, err)
		err = quotaTracker.IncrementUsage(context.Background(), mUser.ID, authz.ResourceAIInteractionArchive, 10)
		require.NoError(t, err)

		caps, err := pdp.ComputeUserCapabilities(context.Background(), mUser)
		require.NoError(t, err)
		assert.Equal(t, false, caps.CanManageAssets)
		assert.Equal(t, false, caps.CanManageCourses)
		assert.Equal(t, false, caps.CanUsePremiumLLM)
		assert.Equal(t, int64(copilotQuotaFree), caps.CopilotMessageQuota)
		assert.Equal(t, int64(copilotQuotaFree-30), caps.CopilotMessageQuotaLeft)
		assert.Equal(t, int64(copilotRateLimitFree), caps.CopilotMessageRateLimit)
		assert.Equal(t, int64(rateWindowSeconds), caps.CopilotMessageRateWindowSeconds)
		assert.Equal(t, int64(aiDescriptionQuotaFree), caps.AIDescriptionQuota)
		assert.Equal(t, int64(aiDescriptionQuotaFree-5), caps.AIDescriptionQuotaLeft)
		assert.Equal(t, int64(aiDescriptionRateLimitFree), caps.AIDescriptionRateLimit)
		assert.Equal(t, int64(rateWindowSeconds), caps.AIDescriptionRateWindowSeconds)
		assert.Equal(t, int64(aiInteractionTurnQuotaFree), caps.AIInteractionTurnQuota)
		assert.Equal(t, int64(aiInteractionTurnQuotaFree-120), caps.AIInteractionTurnQuotaLeft)
		assert.Equal(t, int64(aiInteractionTurnRateLimitFree), caps.AIInteractionTurnRateLimit)
		assert.Equal(t, int64(rateWindowSeconds), caps.AIInteractionTurnRateWindowSeconds)
		assert.Equal(t, int64(aiInteractionArchiveQuotaFree), caps.AIInteractionArchiveQuota)
		assert.Equal(t, int64(aiInteractionArchiveQuotaFree-10), caps.AIInteractionArchiveQuotaLeft)
		assert.Equal(t, int64(aiInteractionArchiveRateLimitFree), caps.AIInteractionArchiveRateLimit)
		assert.Equal(t, int64(rateWindowSeconds), caps.AIInteractionArchiveRateWindowSeconds)
	})

	t.Run("QuotaExhausted", func(t *testing.T) {
		quotaTracker := newMockQuotaTracker()
		pdp := New(quotaTracker)

		mUser := &model.User{
			Model:    model.Model{ID: 1},
			Username: "test-user",
			Roles:    nil,
			Plan:     model.UserPlanFree,
		}

		err := quotaTracker.IncrementUsage(context.Background(), mUser.ID, authz.ResourceCopilotMessage, copilotQuotaFree+50)
		require.NoError(t, err)
		err = quotaTracker.IncrementUsage(context.Background(), mUser.ID, authz.ResourceAIDescription, aiDescriptionQuotaFree+100)
		require.NoError(t, err)
		err = quotaTracker.IncrementUsage(context.Background(), mUser.ID, authz.ResourceAIInteractionTurn, aiInteractionTurnQuotaFree+5000)
		require.NoError(t, err)
		err = quotaTracker.IncrementUsage(context.Background(), mUser.ID, authz.ResourceAIInteractionArchive, aiInteractionArchiveQuotaFree+3000)
		require.NoError(t, err)

		caps, err := pdp.ComputeUserCapabilities(context.Background(), mUser)
		require.NoError(t, err)
		assert.Equal(t, int64(copilotQuotaFree), caps.CopilotMessageQuota)
		assert.Equal(t, int64(0), caps.CopilotMessageQuotaLeft)
		assert.Equal(t, int64(copilotRateLimitFree), caps.CopilotMessageRateLimit)
		assert.Equal(t, int64(rateWindowSeconds), caps.CopilotMessageRateWindowSeconds)
		assert.Equal(t, int64(aiDescriptionQuotaFree), caps.AIDescriptionQuota)
		assert.Equal(t, int64(0), caps.AIDescriptionQuotaLeft)
		assert.Equal(t, int64(aiDescriptionRateLimitFree), caps.AIDescriptionRateLimit)
		assert.Equal(t, int64(rateWindowSeconds), caps.AIDescriptionRateWindowSeconds)
		assert.Equal(t, int64(aiInteractionTurnQuotaFree), caps.AIInteractionTurnQuota)
		assert.Equal(t, int64(0), caps.AIInteractionTurnQuotaLeft)
		assert.Equal(t, int64(aiInteractionTurnRateLimitFree), caps.AIInteractionTurnRateLimit)
		assert.Equal(t, int64(rateWindowSeconds), caps.AIInteractionTurnRateWindowSeconds)
		assert.Equal(t, int64(aiInteractionArchiveQuotaFree), caps.AIInteractionArchiveQuota)
		assert.Equal(t, int64(0), caps.AIInteractionArchiveQuotaLeft)
		assert.Equal(t, int64(aiInteractionArchiveRateLimitFree), caps.AIInteractionArchiveRateLimit)
		assert.Equal(t, int64(rateWindowSeconds), caps.AIInteractionArchiveRateWindowSeconds)
	})
}

func TestRemainingQuota(t *testing.T) {
	for _, tt := range []struct {
		name  string
		total int64
		used  int64
		want  int64
	}{
		{
			name:  "UsageLessThanTotal",
			total: 100,
			used:  40,
			want:  60,
		},
		{
			name:  "UsageEqualToTotal",
			total: 100,
			used:  100,
			want:  0,
		},
		{
			name:  "UsageGreaterThanTotal",
			total: 100,
			used:  150,
			want:  0,
		},
		{
			name:  "NegativeUsage",
			total: 100,
			used:  -10,
			want:  110,
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got := remainingQuota(tt.total, tt.used)
			assert.Equal(t, tt.want, got)
		})
	}
}
