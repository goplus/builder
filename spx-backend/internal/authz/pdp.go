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

	// CopilotMessageRateLimit is the maximum number of copilot messages allowed within the rate window.
	CopilotMessageRateLimit int64 `json:"copilotMessageRateLimit"`

	// CopilotMessageRateWindowSeconds is the duration of the rate limiting window in seconds.
	CopilotMessageRateWindowSeconds int64 `json:"copilotMessageRateWindowSeconds"`

	// AIDescriptionQuota is the total quota for AI description generations.
	AIDescriptionQuota int64 `json:"aiDescriptionQuota"`

	// AIDescriptionQuotaLeft is the remaining quota for AI description generations.
	AIDescriptionQuotaLeft int64 `json:"aiDescriptionQuotaLeft"`

	// AIDescriptionRateLimit is the maximum number of AI descriptions allowed within the rate window.
	AIDescriptionRateLimit int64 `json:"aiDescriptionRateLimit"`

	// AIDescriptionRateWindowSeconds is the duration of the rate limiting window in seconds.
	AIDescriptionRateWindowSeconds int64 `json:"aiDescriptionRateWindowSeconds"`

	// AIInteractionTurnQuota is the total quota for AI interaction turns.
	AIInteractionTurnQuota int64 `json:"aiInteractionTurnQuota"`

	// AIInteractionTurnQuotaLeft is the remaining quota for AI interaction turns.
	AIInteractionTurnQuotaLeft int64 `json:"aiInteractionTurnQuotaLeft"`

	// AIInteractionTurnRateLimit is the maximum number of AI interaction turns allowed within the rate window.
	AIInteractionTurnRateLimit int64 `json:"aiInteractionTurnRateLimit"`

	// AIInteractionTurnRateWindowSeconds is the duration of the rate limiting window in seconds.
	AIInteractionTurnRateWindowSeconds int64 `json:"aiInteractionTurnRateWindowSeconds"`

	// AIInteractionArchiveQuota is the total quota for AI interaction archive requests.
	AIInteractionArchiveQuota int64 `json:"aiInteractionArchiveQuota"`

	// AIInteractionArchiveQuotaLeft is the remaining quota for AI interaction archive requests.
	AIInteractionArchiveQuotaLeft int64 `json:"aiInteractionArchiveQuotaLeft"`

	// AIInteractionArchiveRateLimit is the maximum number of AI interaction archive requests allowed within the rate window.
	AIInteractionArchiveRateLimit int64 `json:"aiInteractionArchiveRateLimit"`

	// AIInteractionArchiveRateWindowSeconds is the duration of the rate limiting window in seconds.
	AIInteractionArchiveRateWindowSeconds int64 `json:"aiInteractionArchiveRateWindowSeconds"`
}
