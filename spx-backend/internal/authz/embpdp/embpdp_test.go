package embpdp

import (
	"cmp"
	"context"
	"fmt"
	"slices"
	"testing"
	"time"

	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var (
	copilotQuotaLimitFree = quotaLimitForPlan(authz.ResourceCopilotMessage, model.UserPlanFree)
	copilotQuotaLimitPlus = quotaLimitForPlan(authz.ResourceCopilotMessage, model.UserPlanPlus)
	copilotQuotaWindow    = quotaWindowFor(authz.ResourceCopilotMessage)

	aiDescriptionQuotaLimitFree = quotaLimitForPlan(authz.ResourceAIDescription, model.UserPlanFree)
	aiDescriptionQuotaLimitPlus = quotaLimitForPlan(authz.ResourceAIDescription, model.UserPlanPlus)
	aiDescriptionQuotaWindow    = quotaWindowFor(authz.ResourceAIDescription)

	aiInteractionTurnQuotaLimitFree = quotaLimitForPlan(authz.ResourceAIInteractionTurn, model.UserPlanFree)
	aiInteractionTurnQuotaLimitPlus = quotaLimitForPlan(authz.ResourceAIInteractionTurn, model.UserPlanPlus)
	aiInteractionTurnQuotaWindow    = quotaWindowFor(authz.ResourceAIInteractionTurn)

	aiInteractionArchiveQuotaLimitFree = quotaLimitForPlan(authz.ResourceAIInteractionArchive, model.UserPlanFree)
	aiInteractionArchiveQuotaLimitPlus = quotaLimitForPlan(authz.ResourceAIInteractionArchive, model.UserPlanPlus)
	aiInteractionArchiveQuotaWindow    = quotaWindowFor(authz.ResourceAIInteractionArchive)
)

func quotaLimitForPlan(resource authz.Resource, plan model.UserPlan) int64 {
	for _, spec := range quotaLimitSpecs {
		if spec.Resource == resource {
			return spec.policy(plan).Limit
		}
	}
	panic(fmt.Sprintf("unsupported quota resource %q", resource))
}

func quotaWindowFor(resource authz.Resource) time.Duration {
	for _, spec := range quotaLimitSpecs {
		if spec.Resource == resource {
			return spec.Window
		}
	}
	panic(fmt.Sprintf("unsupported quota resource %q", resource))
}

type mockQuotaTracker struct {
	usage map[string]authz.QuotaUsage
}

func newMockQuotaTracker() *mockQuotaTracker {
	return &mockQuotaTracker{usage: make(map[string]authz.QuotaUsage)}
}

func (m *mockQuotaTracker) Usage(ctx context.Context, userID int64, policy authz.QuotaPolicy) (authz.QuotaUsage, error) {
	key := fmt.Sprintf("%d:%s", userID, policy.Name)
	return m.usage[key], nil
}

func (m *mockQuotaTracker) ResetUsage(ctx context.Context, userID int64, policy authz.QuotaPolicy) error {
	key := fmt.Sprintf("%d:%s", userID, policy.Name)
	m.usage[key] = authz.QuotaUsage{}
	return nil
}

func (m *mockQuotaTracker) TryConsume(ctx context.Context, userID int64, policies []authz.QuotaPolicy, amount int64) (*authz.Quota, error) {
	for _, policy := range policies {
		key := fmt.Sprintf("%d:%s", userID, policy.Name)
		usage := m.usage[key]
		if policy.Limit > 0 && usage.Used+amount > policy.Limit {
			return &authz.Quota{
				QuotaPolicy: policy,
				QuotaUsage: authz.QuotaUsage{
					Used:      usage.Used,
					ResetTime: time.Now().Add(policy.Window),
				},
			}, nil
		}
	}
	for _, policy := range policies {
		m.addUsage(userID, policy, amount)
	}
	return nil, nil
}

func (m *mockQuotaTracker) addUsage(userID int64, policy authz.QuotaPolicy, amount int64) {
	key := fmt.Sprintf("%d:%s", userID, policy.Name)
	entry := m.usage[key]
	entry.Used += amount
	if policy.Window > 0 {
		entry.ResetTime = time.Now().Add(policy.Window)
	}
	m.usage[key] = entry
}

func TestQuotaSpecs(t *testing.T) {
	t.Run("UniqueNames", func(t *testing.T) {
		seen := make(map[string]string)
		record := func(name, kind, resource string) {
			assert.NotEmptyf(t, name, "%s spec for resource %s must have name", kind, resource)
			if name == "" {
				return
			}
			if prev, ok := seen[name]; ok {
				assert.Failf(t, "duplicate spec name", "%s conflicts with %s", name, prev)
				return
			}
			seen[name] = fmt.Sprintf("%s(%s)", kind, resource)
		}

		for _, spec := range quotaLimitSpecs {
			record(spec.Name, "limit", string(spec.Resource))
		}

		for resource, specs := range rateLimitSpecs {
			for _, spec := range specs {
				record(spec.Name, "rateLimit", string(resource))
			}
		}
	})

	t.Run("RateLimitSpecsSorted", func(t *testing.T) {
		for resource, specs := range rateLimitSpecs {
			isSorted := slices.IsSortedFunc(specs, func(a, b quotaSpec) int {
				if diff := cmp.Compare(a.Window, b.Window); diff != 0 {
					return diff
				}
				return cmp.Compare(a.Limit, b.Limit)
			})
			assert.Truef(t, isSorted, "rate limit specs for %s must be ordered by window then limit", resource)
		}
	})

	t.Run("RateLimitSpecsNonEmpty", func(t *testing.T) {
		for resource, specs := range rateLimitSpecs {
			assert.NotEmptyf(t, specs, "rate limit specs for %s must not be empty", resource)
		}
	})
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
			wantCopilotMessageQuotaWindow       time.Duration
			wantAIDescriptionQuotaLimit         int64
			wantAIDescriptionQuotaWindow        time.Duration
			wantAIInteractionTurnQuotaLimit     int64
			wantAIInteractionTurnQuotaWindow    time.Duration
			wantAIInteractionArchiveQuotaLimit  int64
			wantAIInteractionArchiveQuotaWindow time.Duration
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
				wantCopilotMessageQuotaWindow:       copilotQuotaWindow,
				wantAIDescriptionQuotaLimit:         aiDescriptionQuotaLimitPlus,
				wantAIDescriptionQuotaWindow:        aiDescriptionQuotaWindow,
				wantAIInteractionTurnQuotaLimit:     aiInteractionTurnQuotaLimitPlus,
				wantAIInteractionTurnQuotaWindow:    aiInteractionTurnQuotaWindow,
				wantAIInteractionArchiveQuotaLimit:  aiInteractionArchiveQuotaLimitPlus,
				wantAIInteractionArchiveQuotaWindow: aiInteractionArchiveQuotaWindow,
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
				wantCopilotMessageQuotaWindow:       copilotQuotaWindow,
				wantAIDescriptionQuotaLimit:         aiDescriptionQuotaLimitPlus,
				wantAIDescriptionQuotaWindow:        aiDescriptionQuotaWindow,
				wantAIInteractionTurnQuotaLimit:     aiInteractionTurnQuotaLimitPlus,
				wantAIInteractionTurnQuotaWindow:    aiInteractionTurnQuotaWindow,
				wantAIInteractionArchiveQuotaLimit:  aiInteractionArchiveQuotaLimitPlus,
				wantAIInteractionArchiveQuotaWindow: aiInteractionArchiveQuotaWindow,
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
				wantCopilotMessageQuotaWindow:       copilotQuotaWindow,
				wantAIDescriptionQuotaLimit:         aiDescriptionQuotaLimitFree,
				wantAIDescriptionQuotaWindow:        aiDescriptionQuotaWindow,
				wantAIInteractionTurnQuotaLimit:     aiInteractionTurnQuotaLimitFree,
				wantAIInteractionTurnQuotaWindow:    aiInteractionTurnQuotaWindow,
				wantAIInteractionArchiveQuotaLimit:  aiInteractionArchiveQuotaLimitFree,
				wantAIInteractionArchiveQuotaWindow: aiInteractionArchiveQuotaWindow,
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
				wantCopilotMessageQuotaWindow:       copilotQuotaWindow,
				wantAIDescriptionQuotaLimit:         aiDescriptionQuotaLimitFree,
				wantAIDescriptionQuotaWindow:        aiDescriptionQuotaWindow,
				wantAIInteractionTurnQuotaLimit:     aiInteractionTurnQuotaLimitFree,
				wantAIInteractionTurnQuotaWindow:    aiInteractionTurnQuotaWindow,
				wantAIInteractionArchiveQuotaLimit:  aiInteractionArchiveQuotaLimitFree,
				wantAIInteractionArchiveQuotaWindow: aiInteractionArchiveQuotaWindow,
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
				wantCopilotMessageQuotaWindow:       copilotQuotaWindow,
				wantAIDescriptionQuotaLimit:         aiDescriptionQuotaLimitFree,
				wantAIDescriptionQuotaWindow:        aiDescriptionQuotaWindow,
				wantAIInteractionTurnQuotaLimit:     aiInteractionTurnQuotaLimitFree,
				wantAIInteractionTurnQuotaWindow:    aiInteractionTurnQuotaWindow,
				wantAIInteractionArchiveQuotaLimit:  aiInteractionArchiveQuotaLimitFree,
				wantAIInteractionArchiveQuotaWindow: aiInteractionArchiveQuotaWindow,
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
				wantCopilotMessageQuotaWindow:       copilotQuotaWindow,
				wantAIDescriptionQuotaLimit:         aiDescriptionQuotaLimitFree,
				wantAIDescriptionQuotaWindow:        aiDescriptionQuotaWindow,
				wantAIInteractionTurnQuotaLimit:     aiInteractionTurnQuotaLimitFree,
				wantAIInteractionTurnQuotaWindow:    aiInteractionTurnQuotaWindow,
				wantAIInteractionArchiveQuotaLimit:  aiInteractionArchiveQuotaLimitFree,
				wantAIInteractionArchiveQuotaWindow: aiInteractionArchiveQuotaWindow,
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
				wantCopilotMessageQuotaWindow:       copilotQuotaWindow,
				wantAIDescriptionQuotaLimit:         aiDescriptionQuotaLimitPlus,
				wantAIDescriptionQuotaWindow:        aiDescriptionQuotaWindow,
				wantAIInteractionTurnQuotaLimit:     aiInteractionTurnQuotaLimitPlus,
				wantAIInteractionTurnQuotaWindow:    aiInteractionTurnQuotaWindow,
				wantAIInteractionArchiveQuotaLimit:  aiInteractionArchiveQuotaLimitPlus,
				wantAIInteractionArchiveQuotaWindow: aiInteractionArchiveQuotaWindow,
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

				quotas, err := pdp.ComputeUserQuotas(context.Background(), tt.mUser)
				require.NoError(t, err)

				copilotMessage, ok := quotas.Limits[authz.ResourceCopilotMessage]
				require.True(t, ok)
				assert.Equal(t, tt.wantCopilotMessageQuotaLimit, copilotMessage.Limit)
				assert.Equal(t, tt.wantCopilotMessageQuotaWindow, copilotMessage.Window)
				assert.Equal(t, copilotMessage.Limit, copilotMessage.Remaining())
				assert.Equal(t, int64(tt.wantCopilotMessageQuotaWindow/time.Second), copilotMessage.Reset())

				aiDescription, ok := quotas.Limits[authz.ResourceAIDescription]
				require.True(t, ok)
				assert.Equal(t, tt.wantAIDescriptionQuotaLimit, aiDescription.Limit)
				assert.Equal(t, tt.wantAIDescriptionQuotaWindow, aiDescription.Window)
				assert.Equal(t, aiDescription.Limit, aiDescription.Remaining())
				assert.Equal(t, int64(tt.wantAIDescriptionQuotaWindow/time.Second), aiDescription.Reset())

				aiInteractionTurn, ok := quotas.Limits[authz.ResourceAIInteractionTurn]
				require.True(t, ok)
				assert.Equal(t, tt.wantAIInteractionTurnQuotaLimit, aiInteractionTurn.Limit)
				assert.Equal(t, tt.wantAIInteractionTurnQuotaWindow, aiInteractionTurn.Window)
				assert.Equal(t, aiInteractionTurn.Limit, aiInteractionTurn.Remaining())
				assert.Equal(t, int64(tt.wantAIInteractionTurnQuotaWindow/time.Second), aiInteractionTurn.Reset())

				aiInteractionArchive, ok := quotas.Limits[authz.ResourceAIInteractionArchive]
				require.True(t, ok)
				assert.Equal(t, tt.wantAIInteractionArchiveQuotaLimit, aiInteractionArchive.Limit)
				assert.Equal(t, tt.wantAIInteractionArchiveQuotaWindow, aiInteractionArchive.Window)
				assert.Equal(t, aiInteractionArchive.Limit, aiInteractionArchive.Remaining())
				assert.Equal(t, int64(tt.wantAIInteractionArchiveQuotaWindow/time.Second), aiInteractionArchive.Reset())
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

		quotaTracker.addUsage(
			mUser.ID,
			authz.QuotaPolicy{
				Name:     "copilotMessage:limit",
				Resource: authz.ResourceCopilotMessage,
				Limit:    copilotQuotaLimitFree,
				Window:   copilotQuotaWindow,
			},
			30,
		)
		quotaTracker.addUsage(
			mUser.ID,
			authz.QuotaPolicy{
				Name:     "aiDescription:limit",
				Resource: authz.ResourceAIDescription,
				Limit:    aiDescriptionQuotaLimitFree,
				Window:   aiDescriptionQuotaWindow,
			},
			5,
		)
		quotaTracker.addUsage(
			mUser.ID,
			authz.QuotaPolicy{
				Name:     "aiInteractionTurn:limit",
				Resource: authz.ResourceAIInteractionTurn,
				Limit:    aiInteractionTurnQuotaLimitFree,
				Window:   aiInteractionTurnQuotaWindow,
			},
			120,
		)
		quotaTracker.addUsage(
			mUser.ID,
			authz.QuotaPolicy{
				Name:     "aiInteractionArchive:limit",
				Resource: authz.ResourceAIInteractionArchive,
				Limit:    aiInteractionArchiveQuotaLimitFree,
				Window:   aiInteractionArchiveQuotaWindow,
			},
			10,
		)

		caps, err := pdp.ComputeUserCapabilities(context.Background(), mUser)
		require.NoError(t, err)
		assert.Equal(t, false, caps.CanManageAssets)
		assert.Equal(t, false, caps.CanManageCourses)
		assert.Equal(t, false, caps.CanUsePremiumLLM)

		quotas, err := pdp.ComputeUserQuotas(context.Background(), mUser)
		require.NoError(t, err)

		copilotMessage, ok := quotas.Limits[authz.ResourceCopilotMessage]
		require.True(t, ok)
		assert.Equal(t, int64(copilotQuotaLimitFree), copilotMessage.Limit)
		assert.Equal(t, copilotQuotaWindow, copilotMessage.Window)
		assert.Equal(t, int64(copilotQuotaLimitFree-30), copilotMessage.Remaining())
		assert.Equal(t, int64(copilotQuotaWindow/time.Second), copilotMessage.Reset())

		aiDescription, ok := quotas.Limits[authz.ResourceAIDescription]
		require.True(t, ok)
		assert.Equal(t, int64(aiDescriptionQuotaLimitFree), aiDescription.Limit)
		assert.Equal(t, aiDescriptionQuotaWindow, aiDescription.Window)
		assert.Equal(t, int64(aiDescriptionQuotaLimitFree-5), aiDescription.Remaining())
		assert.Equal(t, int64(aiDescriptionQuotaWindow/time.Second), aiDescription.Reset())

		aiInteractionTurn, ok := quotas.Limits[authz.ResourceAIInteractionTurn]
		require.True(t, ok)
		assert.Equal(t, int64(aiInteractionTurnQuotaLimitFree), aiInteractionTurn.Limit)
		assert.Equal(t, aiInteractionTurnQuotaWindow, aiInteractionTurn.Window)
		assert.Equal(t, int64(aiInteractionTurnQuotaLimitFree-120), aiInteractionTurn.Remaining())
		assert.Equal(t, int64(aiInteractionTurnQuotaWindow/time.Second), aiInteractionTurn.Reset())

		aiInteractionArchive, ok := quotas.Limits[authz.ResourceAIInteractionArchive]
		require.True(t, ok)
		assert.Equal(t, int64(aiInteractionArchiveQuotaLimitFree), aiInteractionArchive.Limit)
		assert.Equal(t, aiInteractionArchiveQuotaWindow, aiInteractionArchive.Window)
		assert.Equal(t, int64(aiInteractionArchiveQuotaLimitFree-10), aiInteractionArchive.Remaining())
		assert.Equal(t, int64(aiInteractionArchiveQuotaWindow/time.Second), aiInteractionArchive.Reset())
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

		quotaTracker.addUsage(
			mUser.ID,
			authz.QuotaPolicy{
				Name:     "copilotMessage:limit",
				Resource: authz.ResourceCopilotMessage,
				Limit:    copilotQuotaLimitFree,
				Window:   copilotQuotaWindow,
			},
			copilotQuotaLimitFree+50,
		)
		quotaTracker.addUsage(
			mUser.ID,
			authz.QuotaPolicy{
				Name:     "aiDescription:limit",
				Resource: authz.ResourceAIDescription,
				Limit:    aiDescriptionQuotaLimitFree,
				Window:   aiDescriptionQuotaWindow,
			},
			aiDescriptionQuotaLimitFree+100,
		)
		quotaTracker.addUsage(
			mUser.ID,
			authz.QuotaPolicy{
				Name:     "aiInteractionTurn:limit",
				Resource: authz.ResourceAIInteractionTurn,
				Limit:    aiInteractionTurnQuotaLimitFree,
				Window:   aiInteractionTurnQuotaWindow,
			},
			aiInteractionTurnQuotaLimitFree+5000,
		)
		quotaTracker.addUsage(
			mUser.ID,
			authz.QuotaPolicy{
				Name:     "aiInteractionArchive:limit",
				Resource: authz.ResourceAIInteractionArchive,
				Limit:    aiInteractionArchiveQuotaLimitFree,
				Window:   aiInteractionArchiveQuotaWindow,
			},
			aiInteractionArchiveQuotaLimitFree+3000,
		)

		quotas, err := pdp.ComputeUserQuotas(context.Background(), mUser)
		require.NoError(t, err)
		for resource, wantLimit := range map[authz.Resource]int64{
			authz.ResourceCopilotMessage:       copilotQuotaLimitFree,
			authz.ResourceAIDescription:        aiDescriptionQuotaLimitFree,
			authz.ResourceAIInteractionTurn:    aiInteractionTurnQuotaLimitFree,
			authz.ResourceAIInteractionArchive: aiInteractionArchiveQuotaLimitFree,
		} {
			quota, ok := quotas.Limits[resource]
			require.True(t, ok)
			assert.Equal(t, wantLimit, quota.Limit)
			assert.Equal(t, quotaWindowFor(resource), quota.Window)
			assert.Equal(t, int64(0), quota.Remaining())
			assert.Equal(t, int64(quotaWindowFor(resource)/time.Second), quota.Reset())
		}
	})
}

func TestQuotaSpec(t *testing.T) {
	t.Run("DefaultLimitUsedWhenNoOverride", func(t *testing.T) {
		spec := quotaSpec{
			QuotaPolicy: authz.QuotaPolicy{
				Name:     "default",
				Resource: authz.ResourceCopilotMessage,
				Limit:    50,
				Window:   time.Minute,
			},
		}
		policy := spec.policy(model.UserPlanFree)
		assert.Equal(t, int64(50), policy.Limit)
		assert.Equal(t, spec.QuotaPolicy, policy)
		assert.Equal(t, spec.Name, policy.Name)
		assert.Equal(t, spec.Resource, policy.Resource)
		assert.Equal(t, spec.Window, policy.Window)
	})

	t.Run("OverrideAppliedForPlusPlan", func(t *testing.T) {
		spec := quotaSpec{
			QuotaPolicy: authz.QuotaPolicy{
				Name:     "plus",
				Resource: authz.ResourceAIDescription,
				Limit:    75,
				Window:   2 * time.Minute,
			},
			limitOverrides: map[model.UserPlan]int64{
				model.UserPlanPlus: 125,
			},
		}
		policy := spec.policy(model.UserPlanPlus)
		assert.Equal(t, int64(125), policy.Limit)
		assert.Equal(t, spec.Name, policy.Name)
		assert.Equal(t, spec.Resource, policy.Resource)
		assert.Equal(t, spec.Window, policy.Window)
	})

	t.Run("UnknownPlanFallsBackToDefault", func(t *testing.T) {
		spec := quotaSpec{
			QuotaPolicy: authz.QuotaPolicy{
				Name:     "enterprise",
				Resource: authz.ResourceAIInteractionTurn,
				Limit:    200,
				Window:   time.Hour,
			},
			limitOverrides: map[model.UserPlan]int64{
				model.UserPlanPlus: 400,
			},
		}
		policy := spec.policy(model.UserPlan(42))
		assert.Equal(t, int64(200), policy.Limit)
		assert.Equal(t, spec.Name, policy.Name)
		assert.Equal(t, spec.Resource, policy.Resource)
		assert.Equal(t, spec.Window, policy.Window)
	})
}

func TestQuotaResetTime(t *testing.T) {
	t.Run("TrackerProvidesReset", func(t *testing.T) {
		resetAt := time.Now().Add(2 * time.Minute)
		usage := authz.QuotaUsage{
			Used:      10,
			ResetTime: resetAt,
		}
		got := quotaResetTime(authz.QuotaPolicy{Limit: 100, Window: 24 * time.Hour}, usage)
		require.True(t, got.Equal(resetAt))
	})

	t.Run("FreshWindowDefaultsToWindow", func(t *testing.T) {
		const window = time.Hour
		usage := authz.QuotaUsage{Used: 0}
		got := quotaResetTime(authz.QuotaPolicy{Limit: 100, Window: window}, usage)
		require.False(t, got.IsZero())

		remaining := time.Until(got)
		require.Greater(t, remaining, 0*time.Second)
		assert.InDelta(t, float64(window), float64(remaining), float64(time.Second))
	})

	t.Run("NoResetTime", func(t *testing.T) {
		usage := authz.QuotaUsage{Used: 100}
		got := quotaResetTime(authz.QuotaPolicy{Limit: 100, Window: time.Hour}, usage)
		assert.True(t, got.IsZero())
	})

	t.Run("ZeroLimitYieldsNoReset", func(t *testing.T) {
		usage := authz.QuotaUsage{Used: 0}
		got := quotaResetTime(authz.QuotaPolicy{Limit: 0, Window: time.Hour}, usage)
		assert.True(t, got.IsZero())
	})
}
