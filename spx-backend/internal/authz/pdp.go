package authz

import (
	"context"

	"github.com/goplus/builder/spx-backend/internal/model"
)

// PolicyDecisionPoint defines the interface for making authorization policy decisions.
type PolicyDecisionPoint interface {
	// ComputeUserCapabilities computes the capabilities for a user.
	ComputeUserCapabilities(ctx context.Context, mUser *model.User) (UserCapabilities, error)

	// ComputeUserQuotas computes the quotas for a user.
	ComputeUserQuotas(ctx context.Context, mUser *model.User) (UserQuotas, error)
}

// UserCapabilities represents user capabilities that control feature access.
type UserCapabilities struct {
	// CanManageAssets indicates if user can manage asset library.
	CanManageAssets bool `json:"canManageAssets"`

	// CanManageCourses indicates if user can manage courses and course series.
	CanManageCourses bool `json:"canManageCourses"`

	// CanUsePremiumLLM indicates if user can access premium LLM models.
	CanUsePremiumLLM bool `json:"canUsePremiumLLM"`
}

// UserQuotas represents user quotas grouped by long-lived limits and
// short-window rate limits.
type UserQuotas struct {
	// Limits stores long-lived limits per resource.
	Limits map[Resource]Quota

	// RateLimits stores short-window rate limits per resource, ordered from
	// shortest to longest window.
	RateLimits map[Resource][]Quota
}
