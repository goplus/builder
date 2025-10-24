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

	// CopilotMessageQuota is the total quota for copilot messages.
	CopilotMessageQuota int64 `json:"copilotMessageQuota"`

	// CopilotMessageQuotaLeft is the remaining quota for copilot messages.
	CopilotMessageQuotaLeft int64 `json:"copilotMessageQuotaLeft"`

	// AIDescriptionQuota is the total quota for AI description generations.
	AIDescriptionQuota int64 `json:"aiDescriptionQuota"`

	// AIDescriptionQuotaLeft is the remaining quota for AI description generations.
	AIDescriptionQuotaLeft int64 `json:"aiDescriptionQuotaLeft"`

	// AIInteractionTurnQuota is the total quota for AI interaction turns.
	AIInteractionTurnQuota int64 `json:"aiInteractionTurnQuota"`

	// AIInteractionTurnQuotaLeft is the remaining quota for AI interaction turns.
	AIInteractionTurnQuotaLeft int64 `json:"aiInteractionTurnQuotaLeft"`

	// AIInteractionArchiveQuota is the total quota for AI interaction archive requests.
	AIInteractionArchiveQuota int64 `json:"aiInteractionArchiveQuota"`

	// AIInteractionArchiveQuotaLeft is the remaining quota for AI interaction archive requests.
	AIInteractionArchiveQuotaLeft int64 `json:"aiInteractionArchiveQuotaLeft"`
}
