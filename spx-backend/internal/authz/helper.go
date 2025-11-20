package authz

import (
	"context"
	"errors"
	"slices"

	"github.com/goplus/builder/spx-backend/internal/authn"
)

// CanManageAssets checks if the user can manage assets.
func CanManageAssets(ctx context.Context) bool {
	caps, ok := UserCapabilitiesFromContext(ctx)
	return ok && caps.CanManageAssets
}

// CanManageCourses checks if the user can manage courses.
func CanManageCourses(ctx context.Context) bool {
	caps, ok := UserCapabilitiesFromContext(ctx)
	return ok && caps.CanManageCourses
}

// CanUsePremiumLLM checks if the user can use premium LLM models.
func CanUsePremiumLLM(ctx context.Context) bool {
	caps, ok := UserCapabilitiesFromContext(ctx)
	return ok && caps.CanUsePremiumLLM
}

// TryConsumeQuota tries to consume the given amount of quotas for the resource.
// It returns a non-nil [*Quota] only when consumption would exceed that quota
// and no system failure occurs.
func TryConsumeQuota(ctx context.Context, resource Resource, amount int64) (*Quota, error) {
	authorizer, ok := authorizerFromContext(ctx)
	if !ok {
		return nil, errors.New("missing authorizer in context")
	}
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return nil, errors.New("missing authenticated user in context")
	}
	quotas, ok := UserQuotasFromContext(ctx)
	if !ok {
		return nil, errors.New("missing user quotas in context")
	}

	// Collect applicable quota policies for the resource.
	var policies []QuotaPolicy
	if quotas, ok := quotas.RateLimits[resource]; ok {
		policies = make([]QuotaPolicy, 0, len(quotas)+1)
		for _, quota := range quotas {
			policies = append(policies, quota.QuotaPolicy)
		}
	}
	if quota, ok := quotas.Limits[resource]; ok {
		policies = slices.Grow(policies, 1)
		policies = append(policies, quota.QuotaPolicy)
	}
	if len(policies) == 0 {
		return nil, nil
	}

	return authorizer.quotaTracker.TryConsume(ctx, mUser.ID, policies, amount)
}
