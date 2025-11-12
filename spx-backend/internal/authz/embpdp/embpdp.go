package embpdp

import (
	"context"
	"fmt"
	"slices"
	"time"

	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/model"
)

var quotaLimitSpecs = []quotaSpec{
	{
		QuotaPolicy: authz.QuotaPolicy{
			Name:     fmt.Sprintf("%s:limit", authz.ResourceCopilotMessage),
			Resource: authz.ResourceCopilotMessage,
			Limit:    100,
			Window:   24 * time.Hour,
		},
		limitOverrides: map[model.UserPlan]int64{
			model.UserPlanPlus: 1000,
		},
	},
	{
		QuotaPolicy: authz.QuotaPolicy{
			Name:     fmt.Sprintf("%s:limit", authz.ResourceAIDescription),
			Resource: authz.ResourceAIDescription,
			Limit:    300,
			Window:   24 * time.Hour,
		},
		limitOverrides: map[model.UserPlan]int64{
			model.UserPlanPlus: 1000,
		},
	},
	{
		QuotaPolicy: authz.QuotaPolicy{
			Name:     fmt.Sprintf("%s:limit", authz.ResourceAIInteractionTurn),
			Resource: authz.ResourceAIInteractionTurn,
			Limit:    12000,
			Window:   24 * time.Hour,
		},
		limitOverrides: map[model.UserPlan]int64{
			model.UserPlanPlus: 24000,
		},
	},
	{
		QuotaPolicy: authz.QuotaPolicy{
			Name:     fmt.Sprintf("%s:limit", authz.ResourceAIInteractionArchive),
			Resource: authz.ResourceAIInteractionArchive,
			Limit:    8000,
			Window:   24 * time.Hour,
		},
		limitOverrides: map[model.UserPlan]int64{
			model.UserPlanPlus: 16000,
		},
	},
}

// embeddedPDP implements [authz.PolicyDecisionPoint] with embedded authorization policies.
type embeddedPDP struct {
	quotaTracker authz.QuotaTracker
}

// New creates a new embedded PDP.
func New(quotaTracker authz.QuotaTracker) authz.PolicyDecisionPoint {
	return &embeddedPDP{
		quotaTracker: quotaTracker,
	}
}

// ComputeUserCapabilities implements [authz.PolicyDecisionPoint].
func (p *embeddedPDP) ComputeUserCapabilities(ctx context.Context, mUser *model.User) (authz.UserCapabilities, error) {
	return authz.UserCapabilities{
		CanManageAssets:  p.hasRole(mUser, userRoleAssetAdmin),
		CanManageCourses: p.hasRole(mUser, userRoleCourseAdmin),
		CanUsePremiumLLM: p.hasPlusPlan(mUser),
	}, nil
}

// ComputeUserQuotas implements [authz.PolicyDecisionPoint].
func (p *embeddedPDP) ComputeUserQuotas(ctx context.Context, mUser *model.User) (authz.UserQuotas, error) {
	limits := make(map[authz.Resource]authz.Quota, len(quotaLimitSpecs))
	for _, spec := range quotaLimitSpecs {
		policy := spec.policy(mUser.Plan)

		usage, err := p.quotaTracker.Usage(ctx, mUser.ID, policy)
		if err != nil {
			return authz.UserQuotas{}, fmt.Errorf("failed to retrieve %s quota usage for user %q: %w", policy.Resource, mUser.Username, err)
		}
		usage.ResetTime = quotaResetTime(policy.Window, usage)

		limits[policy.Resource] = authz.Quota{QuotaPolicy: policy, QuotaUsage: usage}
	}
	return authz.UserQuotas{
		Limits:     limits,
		RateLimits: make(map[authz.Resource][]authz.Quota),
	}, nil
}

// hasRole checks if the user has a specific role.
func (p *embeddedPDP) hasRole(mUser *model.User, role userRole) bool {
	if len(mUser.Roles) == 0 {
		return false
	}
	return slices.Contains(mUser.Roles, string(role))
}

// hasPlusPlan checks if the user has a plus plan.
func (p *embeddedPDP) hasPlusPlan(mUser *model.User) bool {
	return mUser.Plan == model.UserPlanPlus
}

// quotaSpec holds the default quota policy together with plan-specific limit overrides.
type quotaSpec struct {
	authz.QuotaPolicy

	limitOverrides map[model.UserPlan]int64
}

// policy returns a copy of the quota policy with the limit adjusted for the
// requested plan.
func (qs quotaSpec) policy(plan model.UserPlan) authz.QuotaPolicy {
	policy := qs.QuotaPolicy
	if override, ok := qs.limitOverrides[plan]; ok {
		policy.Limit = override
	}
	return policy
}

// userRole represents a user role in the system.
type userRole string

const (
	userRoleAssetAdmin  userRole = "assetAdmin"
	userRoleCourseAdmin userRole = "courseAdmin"
)

// quotaResetTime returns the time when the quota window resets for the given usage data.
func quotaResetTime(window time.Duration, usage authz.QuotaUsage) time.Time {
	if usage.ResetTime.IsZero() {
		if usage.Used == 0 && window > 0 {
			return time.Now().Add(window)
		}
		return time.Time{}
	}
	return usage.ResetTime
}
