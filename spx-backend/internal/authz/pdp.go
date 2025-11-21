package authz

import (
	"context"

	"github.com/goplus/builder/spx-backend/internal/model"
)

// PolicyDecisionPoint defines the interface for making authorization policy decisions.
type PolicyDecisionPoint interface {
	// ComputeUserCapabilities computes the capabilities for a user.
	ComputeUserCapabilities(ctx context.Context, mUser *model.User) (UserCapabilities, error)

	// ComputeUserQuotaPolicies computes the quota policies for a user.
	ComputeUserQuotaPolicies(ctx context.Context, mUser *model.User) (UserQuotaPolicies, error)
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

// UserQuotaPolicies represents quota policies grouped by long-lived limits and
// short-window rate limits.
type UserQuotaPolicies struct {
	// Limits stores long-lived limit policies per resource.
	Limits map[Resource]QuotaPolicy

	// RateLimits stores short-window rate limit policies per resource,
	// ordered from shortest to longest window.
	RateLimits map[Resource][]QuotaPolicy
}
