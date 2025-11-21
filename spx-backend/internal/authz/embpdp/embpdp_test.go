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

func (m *mockQuotaTracker) Usage(ctx context.Context, userID int64, policies []authz.QuotaPolicy) ([]authz.QuotaUsage, error) {
	usages := make([]authz.QuotaUsage, len(policies))
	for i, policy := range policies {
		key := fmt.Sprintf("%d:%s", userID, policy.Name)
		usages[i] = m.usage[key]
	}
	return usages, nil
}

func (m *mockQuotaTracker) ResetUsage(ctx context.Context, userID int64, policies []authz.QuotaPolicy) error {
	for _, policy := range policies {
		key := fmt.Sprintf("%d:%s", userID, policy.Name)
		m.usage[key] = authz.QuotaUsage{}
	}
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
	for _, tt := range []struct {
		name                 string
		mUser                *model.User
		wantCanManageAssets  bool
		wantCanManageCourses bool
		wantCanUsePremiumLLM bool
	}{
		{
			name: "AssetAdminWithPlusPlan",
			mUser: &model.User{
				Model:    model.Model{ID: 1},
				Username: "admin-user",
				Roles:    model.UserRoles{"assetAdmin"},
				Plan:     model.UserPlanPlus,
			},
			wantCanManageAssets:  true,
			wantCanManageCourses: false,
			wantCanUsePremiumLLM: true,
		},
		{
			name: "RegularPlusUser",
			mUser: &model.User{
				Model:    model.Model{ID: 2},
				Username: "plus-user",
				Plan:     model.UserPlanPlus,
			},
			wantCanManageAssets:  false,
			wantCanManageCourses: false,
			wantCanUsePremiumLLM: true,
		},
		{
			name: "RegularFreeUser",
			mUser: &model.User{
				Model:    model.Model{ID: 3},
				Username: "free-user",
				Plan:     model.UserPlanFree,
			},
			wantCanManageAssets:  false,
			wantCanManageCourses: false,
			wantCanUsePremiumLLM: false,
		},
		{
			name: "UserWithMultipleRoles",
			mUser: &model.User{
				Model:    model.Model{ID: 5},
				Username: "multi-role-user",
				Roles:    model.UserRoles{"user", "assetAdmin"},
				Plan:     model.UserPlanFree,
			},
			wantCanManageAssets:  true,
			wantCanManageCourses: false,
			wantCanUsePremiumLLM: false,
		},
		{
			name: "CourseAdminUser",
			mUser: &model.User{
				Model:    model.Model{ID: 6},
				Username: "course-admin-user",
				Roles:    model.UserRoles{"courseAdmin"},
				Plan:     model.UserPlanFree,
			},
			wantCanManageAssets:  false,
			wantCanManageCourses: true,
			wantCanUsePremiumLLM: false,
		},
		{
			name: "UserWithMultipleAdminRoles",
			mUser: &model.User{
				Model:    model.Model{ID: 7},
				Username: "multi-admin-user",
				Roles:    model.UserRoles{"assetAdmin", "courseAdmin"},
				Plan:     model.UserPlanPlus,
			},
			wantCanManageAssets:  true,
			wantCanManageCourses: true,
			wantCanUsePremiumLLM: true,
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
		})
	}
}

func TestEmbeddedPDPComputeUserQuotaPolicies(t *testing.T) {
	for _, tt := range []struct {
		name       string
		mUser      *model.User
		wantLimits map[authz.Resource]struct {
			limit  int64
			window time.Duration
		}
		wantRateLimits map[authz.Resource][]struct {
			limit  int64
			window time.Duration
		}
	}{
		{
			name:  "FreePlan",
			mUser: &model.User{Plan: model.UserPlanFree},
			wantLimits: map[authz.Resource]struct {
				limit  int64
				window time.Duration
			}{
				authz.ResourceCopilotMessage:       {limit: copilotQuotaLimitFree, window: copilotQuotaWindow},
				authz.ResourceAIDescription:        {limit: aiDescriptionQuotaLimitFree, window: aiDescriptionQuotaWindow},
				authz.ResourceAIInteractionTurn:    {limit: aiInteractionTurnQuotaLimitFree, window: aiInteractionTurnQuotaWindow},
				authz.ResourceAIInteractionArchive: {limit: aiInteractionArchiveQuotaLimitFree, window: aiInteractionArchiveQuotaWindow},
			},
			wantRateLimits: map[authz.Resource][]struct {
				limit  int64
				window time.Duration
			}{
				authz.ResourceCopilotMessage:       {{limit: 30, window: time.Minute}},
				authz.ResourceAIDescription:        {{limit: 10, window: time.Minute}},
				authz.ResourceAIInteractionTurn:    {{limit: 20, window: time.Minute}},
				authz.ResourceAIInteractionArchive: {{limit: 10, window: time.Minute}},
			},
		},
		{
			name:  "PlusPlan",
			mUser: &model.User{Plan: model.UserPlanPlus},
			wantLimits: map[authz.Resource]struct {
				limit  int64
				window time.Duration
			}{
				authz.ResourceCopilotMessage:       {limit: copilotQuotaLimitPlus, window: copilotQuotaWindow},
				authz.ResourceAIDescription:        {limit: aiDescriptionQuotaLimitPlus, window: aiDescriptionQuotaWindow},
				authz.ResourceAIInteractionTurn:    {limit: aiInteractionTurnQuotaLimitPlus, window: aiInteractionTurnQuotaWindow},
				authz.ResourceAIInteractionArchive: {limit: aiInteractionArchiveQuotaLimitPlus, window: aiInteractionArchiveQuotaWindow},
			},
			wantRateLimits: map[authz.Resource][]struct {
				limit  int64
				window time.Duration
			}{
				authz.ResourceCopilotMessage:       {{limit: 60, window: time.Minute}},
				authz.ResourceAIDescription:        {{limit: 30, window: time.Minute}},
				authz.ResourceAIInteractionTurn:    {{limit: 60, window: time.Minute}},
				authz.ResourceAIInteractionArchive: {{limit: 20, window: time.Minute}},
			},
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			pdp := New(newMockQuotaTracker())

			policies, err := pdp.ComputeUserQuotaPolicies(context.Background(), tt.mUser)
			require.NoError(t, err)
			for resource, want := range tt.wantLimits {
				got, ok := policies.Limits[resource]
				require.True(t, ok)
				assert.Equal(t, want.limit, got.Limit)
				assert.Equal(t, want.window, got.Window)
			}
			for resource, wantList := range tt.wantRateLimits {
				gotList, ok := policies.RateLimits[resource]
				require.True(t, ok)
				require.Len(t, gotList, len(wantList))
				for i, want := range wantList {
					assert.Equal(t, want.limit, gotList[i].Limit)
					assert.Equal(t, want.window, gotList[i].Window)
				}
			}
		})
	}
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
