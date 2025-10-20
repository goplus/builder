package embpdp

import (
	"context"
	"fmt"
	"slices"

	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/model"
)

const (
	copilotQuotaFree              = 100
	copilotQuotaPlus              = 1000
	aiDescriptionQuotaFree        = 300
	aiDescriptionQuotaPlus        = 1000
	aiInteractionTurnQuotaFree    = 12000
	aiInteractionTurnQuotaPlus    = 24000
	aiInteractionArchiveQuotaFree = 8000
	aiInteractionArchiveQuotaPlus = 16000
)

// embeddedPDP implements authz.PolicyDecisionPoint with embedded authorization policies.
type embeddedPDP struct {
	quotaTracker authz.QuotaTracker
}

// New creates a new embedded PDP.
func New(quotaTracker authz.QuotaTracker) authz.PolicyDecisionPoint {
	return &embeddedPDP{
		quotaTracker: quotaTracker,
	}
}

// ComputeUserCapabilities implements authz.PolicyDecisionPoint.
func (p *embeddedPDP) ComputeUserCapabilities(ctx context.Context, mUser *model.User) (authz.UserCapabilities, error) {
	caps := authz.UserCapabilities{
		CanManageAssets:           p.hasRole(mUser, userRoleAssetAdmin),
		CanManageCourses:          p.hasRole(mUser, userRoleCourseAdmin),
		CanUsePremiumLLM:          p.hasPlusPlan(mUser),
		CopilotMessageQuota:       p.getCopilotQuota(mUser),
		AIDescriptionQuota:        p.getAIDescriptionQuota(mUser),
		AIInteractionTurnQuota:    p.getAIInteractionTurnQuota(mUser),
		AIInteractionArchiveQuota: p.getAIInteractionArchiveQuota(mUser),
	}
	if usage, err := p.quotaTracker.Usage(ctx, mUser.ID, authz.ResourceCopilotMessage); err != nil {
		return authz.UserCapabilities{}, fmt.Errorf("failed to retrieve copilot message quota usage for user %q: %w", mUser.Username, err)
	} else {
		caps.CopilotMessageQuotaLeft = remainingQuota(caps.CopilotMessageQuota, usage)
	}
	if usage, err := p.quotaTracker.Usage(ctx, mUser.ID, authz.ResourceAIDescription); err != nil {
		return authz.UserCapabilities{}, fmt.Errorf("failed to retrieve ai description quota usage for user %q: %w", mUser.Username, err)
	} else {
		caps.AIDescriptionQuotaLeft = remainingQuota(caps.AIDescriptionQuota, usage)
	}
	if usage, err := p.quotaTracker.Usage(ctx, mUser.ID, authz.ResourceAIInteractionTurn); err != nil {
		return authz.UserCapabilities{}, fmt.Errorf("failed to retrieve ai interaction turn quota usage for user %q: %w", mUser.Username, err)
	} else {
		caps.AIInteractionTurnQuotaLeft = remainingQuota(caps.AIInteractionTurnQuota, usage)
	}
	if usage, err := p.quotaTracker.Usage(ctx, mUser.ID, authz.ResourceAIInteractionArchive); err != nil {
		return authz.UserCapabilities{}, fmt.Errorf("failed to retrieve ai interaction archive quota usage for user %q: %w", mUser.Username, err)
	} else {
		caps.AIInteractionArchiveQuotaLeft = remainingQuota(caps.AIInteractionArchiveQuota, usage)
	}
	return caps, nil
}

// userRole represents a user role in the system.
type userRole string

const (
	userRoleAssetAdmin  userRole = "assetAdmin"
	userRoleCourseAdmin userRole = "courseAdmin"
)

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

// getCopilotQuota returns the appropriate quota based on user plan.
func (p *embeddedPDP) getCopilotQuota(mUser *model.User) int64 {
	switch mUser.Plan {
	case model.UserPlanPlus:
		return copilotQuotaPlus
	default:
		return copilotQuotaFree
	}
}

// getAIDescriptionQuota returns the daily AI description quota for the user.
func (p *embeddedPDP) getAIDescriptionQuota(mUser *model.User) int64 {
	switch mUser.Plan {
	case model.UserPlanPlus:
		return aiDescriptionQuotaPlus
	default:
		return aiDescriptionQuotaFree
	}
}

// getAIInteractionTurnQuota returns the daily AI interaction turn quota for the user.
func (p *embeddedPDP) getAIInteractionTurnQuota(mUser *model.User) int64 {
	switch mUser.Plan {
	case model.UserPlanPlus:
		return aiInteractionTurnQuotaPlus
	default:
		return aiInteractionTurnQuotaFree
	}
}

// getAIInteractionArchiveQuota returns the daily AI interaction archive quota for the user.
func (p *embeddedPDP) getAIInteractionArchiveQuota(mUser *model.User) int64 {
	switch mUser.Plan {
	case model.UserPlanPlus:
		return aiInteractionArchiveQuotaPlus
	default:
		return aiInteractionArchiveQuotaFree
	}
}

// remainingQuota returns the leftover quota after deducting the used amount.
func remainingQuota(total, used int64) int64 {
	return max(total-used, 0)
}
