package embpdp

import (
	"context"
	"fmt"
	"slices"
	"time"

	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/model"
)

var (
	// quotaLimitSpecs defines long-window quota limits per resource and plan.
	quotaLimitSpecs = []quotaSpec{
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

	// rateLimitSpecs defines short-window rate limits per resource and plan.
	//
	// NOTE: Entries must be ordered by ascending window and then limit.
	rateLimitSpecs = map[authz.Resource][]quotaSpec{
		authz.ResourceCopilotMessage: {
			{
				QuotaPolicy: authz.QuotaPolicy{
					Name:     fmt.Sprintf("%s:rateLimit:1m", authz.ResourceCopilotMessage),
					Resource: authz.ResourceCopilotMessage,
					Limit:    30,
					Window:   time.Minute,
				},
				limitOverrides: map[model.UserPlan]int64{
					model.UserPlanPlus: 60,
				},
			},
		},
		authz.ResourceAIDescription: {
			{
				QuotaPolicy: authz.QuotaPolicy{
					Name:     fmt.Sprintf("%s:rateLimit:1m", authz.ResourceAIDescription),
					Resource: authz.ResourceAIDescription,
					Limit:    10,
					Window:   time.Minute,
				},
				limitOverrides: map[model.UserPlan]int64{
					model.UserPlanPlus: 30,
				},
			},
		},
		authz.ResourceAIInteractionTurn: {
			{
				QuotaPolicy: authz.QuotaPolicy{
					Name:     fmt.Sprintf("%s:rateLimit:1m", authz.ResourceAIInteractionTurn),
					Resource: authz.ResourceAIInteractionTurn,
					Limit:    20,
					Window:   time.Minute,
				},
				limitOverrides: map[model.UserPlan]int64{
					model.UserPlanPlus: 60,
				},
			},
		},
		authz.ResourceAIInteractionArchive: {
			{
				QuotaPolicy: authz.QuotaPolicy{
					Name:     fmt.Sprintf("%s:rateLimit:1m", authz.ResourceAIInteractionArchive),
					Resource: authz.ResourceAIInteractionArchive,
					Limit:    10,
					Window:   time.Minute,
				},
				limitOverrides: map[model.UserPlan]int64{
					model.UserPlanPlus: 20,
				},
			},
		},
	}
)

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

// ComputeUserQuotaPolicies implements [authz.PolicyDecisionPoint].
func (p *embeddedPDP) ComputeUserQuotaPolicies(ctx context.Context, mUser *model.User) (authz.UserQuotaPolicies, error) {
	limits := make(map[authz.Resource]authz.QuotaPolicy, len(quotaLimitSpecs))
	for _, spec := range quotaLimitSpecs {
		limits[spec.Resource] = spec.policy(mUser.Plan)
	}

	rateLimits := make(map[authz.Resource][]authz.QuotaPolicy, len(rateLimitSpecs))
	for resource, specs := range rateLimitSpecs {
		policies := make([]authz.QuotaPolicy, 0, len(specs))
		for _, spec := range specs {
			policies = append(policies, spec.policy(mUser.Plan))
		}
		rateLimits[resource] = policies
	}

	return authz.UserQuotaPolicies{
		Limits:     limits,
		RateLimits: rateLimits,
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

// quotaResetTime returns the time when the quota resets for the given usage data.
func quotaResetTime(policy authz.QuotaPolicy, usage authz.QuotaUsage) time.Time {
	if policy.Limit <= 0 {
		return time.Time{}
	}
	if usage.ResetTime.IsZero() {
		if usage.Used == 0 && policy.Window > 0 {
			return time.Now().Add(policy.Window)
		}
		return time.Time{}
	}
	return usage.ResetTime
}
