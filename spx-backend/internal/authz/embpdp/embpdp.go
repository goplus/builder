package embpdp

import (
	"context"
	"fmt"
	"slices"

	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/model"
)

const (
	copilotQuotaFree     = 100
	copilotQuotaPlus     = 1000
	copilotRateLimitFree = 30
	copilotRateLimitPlus = 60

	aiDescriptionQuotaFree     = 300
	aiDescriptionQuotaPlus     = 1000
	aiDescriptionRateLimitFree = 10
	aiDescriptionRateLimitPlus = 30

	aiInteractionTurnQuotaFree     = 12000
	aiInteractionTurnQuotaPlus     = 24000
	aiInteractionTurnRateLimitFree = 20
	aiInteractionTurnRateLimitPlus = 60

	aiInteractionArchiveQuotaFree     = 8000
	aiInteractionArchiveQuotaPlus     = 16000
	aiInteractionArchiveRateLimitFree = 10
	aiInteractionArchiveRateLimitPlus = 20

	rateWindowSeconds = 60
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

		CopilotMessageQuota:             p.copilotQuota(mUser),
		CopilotMessageRateLimit:         p.copilotRateLimit(mUser),
		CopilotMessageRateWindowSeconds: rateWindowSeconds,

		AIDescriptionQuota:             p.aiDescriptionQuota(mUser),
		AIDescriptionRateLimit:         p.aiDescriptionRateLimit(mUser),
		AIDescriptionRateWindowSeconds: rateWindowSeconds,

		AIInteractionTurnQuota:             p.aiInteractionTurnQuota(mUser),
		AIInteractionTurnRateLimit:         p.aiInteractionTurnRateLimit(mUser),
		AIInteractionTurnRateWindowSeconds: rateWindowSeconds,

		AIInteractionArchiveQuota:             p.aiInteractionArchiveQuota(mUser),
		AIInteractionArchiveRateLimit:         p.aiInteractionArchiveRateLimit(mUser),
		AIInteractionArchiveRateWindowSeconds: rateWindowSeconds,
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

// copilotQuota returns the appropriate quota based on user plan.
func (p *embeddedPDP) copilotQuota(mUser *model.User) int64 {
	switch mUser.Plan {
	case model.UserPlanPlus:
		return copilotQuotaPlus
	default:
		return copilotQuotaFree
	}
}

// copilotRateLimit returns the maximum copilot messages allowed in one rate window for the user.
func (p *embeddedPDP) copilotRateLimit(mUser *model.User) int64 {
	switch mUser.Plan {
	case model.UserPlanPlus:
		return copilotRateLimitPlus
	default:
		return copilotRateLimitFree
	}
}

// aiDescriptionQuota returns the daily AI description quota for the user.
func (p *embeddedPDP) aiDescriptionQuota(mUser *model.User) int64 {
	switch mUser.Plan {
	case model.UserPlanPlus:
		return aiDescriptionQuotaPlus
	default:
		return aiDescriptionQuotaFree
	}
}

// aiDescriptionRateLimit returns the maximum AI descriptions allowed in one rate window for the user.
func (p *embeddedPDP) aiDescriptionRateLimit(mUser *model.User) int64 {
	switch mUser.Plan {
	case model.UserPlanPlus:
		return aiDescriptionRateLimitPlus
	default:
		return aiDescriptionRateLimitFree
	}
}

// aiInteractionTurnQuota returns the daily AI interaction turn quota for the user.
func (p *embeddedPDP) aiInteractionTurnQuota(mUser *model.User) int64 {
	switch mUser.Plan {
	case model.UserPlanPlus:
		return aiInteractionTurnQuotaPlus
	default:
		return aiInteractionTurnQuotaFree
	}
}

// aiInteractionTurnRateLimit returns the maximum AI interaction turns allowed in one rate window for the user.
func (p *embeddedPDP) aiInteractionTurnRateLimit(mUser *model.User) int64 {
	switch mUser.Plan {
	case model.UserPlanPlus:
		return aiInteractionTurnRateLimitPlus
	default:
		return aiInteractionTurnRateLimitFree
	}
}

// aiInteractionArchiveQuota returns the daily AI interaction archive quota for the user.
func (p *embeddedPDP) aiInteractionArchiveQuota(mUser *model.User) int64 {
	switch mUser.Plan {
	case model.UserPlanPlus:
		return aiInteractionArchiveQuotaPlus
	default:
		return aiInteractionArchiveQuotaFree
	}
}

// aiInteractionArchiveRateLimit returns the maximum AI interaction archives allowed in one rate window for the user.
func (p *embeddedPDP) aiInteractionArchiveRateLimit(mUser *model.User) int64 {
	switch mUser.Plan {
	case model.UserPlanPlus:
		return aiInteractionArchiveRateLimitPlus
	default:
		return aiInteractionArchiveRateLimitFree
	}
}

// userRole represents a user role in the system.
type userRole string

const (
	userRoleAssetAdmin  userRole = "assetAdmin"
	userRoleCourseAdmin userRole = "courseAdmin"
)

// remainingQuota returns the leftover quota after deducting the used amount.
func remainingQuota(total, used int64) int64 {
	return max(total-used, 0)
}
