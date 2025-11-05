package authz

import (
	"context"

	"github.com/goplus/builder/spx-backend/internal/model"
)

// PolicyDecisionPoint defines the interface for making authorization policy decisions.
type PolicyDecisionPoint interface {
	// ComputeUserCapabilities computes the capabilities for a user.
	ComputeUserCapabilities(ctx context.Context, mUser *model.User) (UserCapabilities, error)
}

// UserCapabilities represents user capabilities and quotas that control access
// to features and services.
type UserCapabilities struct {
	// CanManageAssets indicates if user can manage asset library.
	CanManageAssets bool `json:"canManageAssets"`

	// CanManageCourses indicates if user can manage courses and course series.
	CanManageCourses bool `json:"canManageCourses"`

	// CanUsePremiumLLM indicates if user can access premium LLM models.
	CanUsePremiumLLM bool `json:"canUsePremiumLLM"`

	// CopilotMessageQuota represents quotas for copilot messages.
	CopilotMessageQuota Quota `json:"-"`

	// AIDescriptionQuota represents quotas for AI description generations.
	AIDescriptionQuota Quota `json:"-"`

	// AIInteractionTurnQuota represents quotas for AI interaction turns.
	AIInteractionTurnQuota Quota `json:"-"`

	// AIInteractionArchiveQuota represents quotas for AI interaction archive requests.
	AIInteractionArchiveQuota Quota `json:"-"`
}

// Quota returns the quota for the given resource.
func (uc UserCapabilities) Quota(resource Resource) (Quota, bool) {
	switch resource {
	case ResourceCopilotMessage:
		return uc.CopilotMessageQuota, true
	case ResourceAIDescription:
		return uc.AIDescriptionQuota, true
	case ResourceAIInteractionTurn:
		return uc.AIInteractionTurnQuota, true
	case ResourceAIInteractionArchive:
		return uc.AIInteractionArchiveQuota, true
	default:
		return Quota{}, false
	}
}
