package authz

import (
	"context"
	"errors"

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

// ConsumeQuota consumes the specified amount of quota for the user and resource.
func ConsumeQuota(ctx context.Context, resource Resource, amount int64) error {
	authorizer, ok := authorizerFromContext(ctx)
	if !ok {
		return errors.New("missing authorizer in context")
	}
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return errors.New("missing authenticated user in context")
	}
	return authorizer.quotaTracker.IncrementUsage(ctx, mUser.ID, resource, amount)
}
