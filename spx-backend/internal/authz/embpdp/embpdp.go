package embpdp

import (
	"context"
	"fmt"
	"slices"
	"time"

	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/model"
)

const (
	copilotQuotaLimitFree = 100
	copilotQuotaLimitPlus = 1000

	aiDescriptionQuotaLimitFree = 300
	aiDescriptionQuotaLimitPlus = 1000

	aiInteractionTurnQuotaLimitFree = 12000
	aiInteractionTurnQuotaLimitPlus = 24000

	aiInteractionArchiveQuotaLimitFree = 8000
	aiInteractionArchiveQuotaLimitPlus = 16000

	quotaWindow = 24 * 60 * 60
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
	caps := authz.UserCapabilities{
		CanManageAssets:  p.hasRole(mUser, userRoleAssetAdmin),
		CanManageCourses: p.hasRole(mUser, userRoleCourseAdmin),
		CanUsePremiumLLM: p.hasPlusPlan(mUser),

		CopilotMessageQuota: authz.Quota{
			Limit:  p.quotaLimitForPlan(mUser, copilotQuotaLimitFree, copilotQuotaLimitPlus),
			Window: quotaWindow,
		},
		AIDescriptionQuota: authz.Quota{
			Limit:  p.quotaLimitForPlan(mUser, aiDescriptionQuotaLimitFree, aiDescriptionQuotaLimitPlus),
			Window: quotaWindow,
		},
		AIInteractionTurnQuota: authz.Quota{
			Limit:  p.quotaLimitForPlan(mUser, aiInteractionTurnQuotaLimitFree, aiInteractionTurnQuotaLimitPlus),
			Window: quotaWindow,
		},
		AIInteractionArchiveQuota: authz.Quota{
			Limit:  p.quotaLimitForPlan(mUser, aiInteractionArchiveQuotaLimitFree, aiInteractionArchiveQuotaLimitPlus),
			Window: quotaWindow,
		},
	}
	for _, v := range []struct {
		resource authz.Resource
		quota    *authz.Quota
	}{
		{resource: authz.ResourceCopilotMessage, quota: &caps.CopilotMessageQuota},
		{resource: authz.ResourceAIDescription, quota: &caps.AIDescriptionQuota},
		{resource: authz.ResourceAIInteractionTurn, quota: &caps.AIInteractionTurnQuota},
		{resource: authz.ResourceAIInteractionArchive, quota: &caps.AIInteractionArchiveQuota},
	} {
		usage, err := p.quotaTracker.Usage(ctx, mUser.ID, v.resource)
		if err != nil {
			return authz.UserCapabilities{}, fmt.Errorf("failed to retrieve %s quota usage for user %q: %w", v.resource, mUser.Username, err)
		}
		v.quota.Remaining = quotaRemaining(v.quota.Limit, usage)
		v.quota.ResetTime = quotaResetTime(v.quota.Window, usage)
	}
	return caps, nil
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

// quotaLimitForPlan returns the quota limit for the user's plan.
func (p *embeddedPDP) quotaLimitForPlan(mUser *model.User, freeLimit, plusLimit int64) int64 {
	if p.hasPlusPlan(mUser) {
		return plusLimit
	}
	return freeLimit
}

// userRole represents a user role in the system.
type userRole string

const (
	userRoleAssetAdmin  userRole = "assetAdmin"
	userRoleCourseAdmin userRole = "courseAdmin"
)

// quotaRemaining returns the leftover quota after deducting the used amount.
func quotaRemaining(limit int64, usage authz.QuotaUsage) int64 {
	return max(limit-usage.Used, 0)
}

// quotaResetTime returns the time when the quota window resets for the given usage data.
func quotaResetTime(window int64, usage authz.QuotaUsage) time.Time {
	if usage.ResetTime.IsZero() {
		if usage.Used == 0 && window > 0 {
			return time.Now().Add(time.Duration(window) * time.Second)
		}
		return time.Time{}
	}
	return usage.ResetTime
}
