package authz

import (
	"context"
	"errors"
	"fmt"
	"time"

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
	caps, ok := UserCapabilitiesFromContext(ctx)
	if !ok {
		return errors.New("missing user capabilities in context")
	}

	policy, err := quotaPolicyFromUserCapabilities(resource, caps)
	if err != nil {
		return err
	}
	return authorizer.quotaTracker.IncrementUsage(ctx, mUser.ID, resource, amount, policy)
}

// quotaPolicyFromUserCapabilities converts [UserCapabilities] data into a
// resource-specific [QuotaPolicy].
func quotaPolicyFromUserCapabilities(resource Resource, caps UserCapabilities) (QuotaPolicy, error) {
	quota, ok := caps.Quota(resource)
	if !ok {
		return QuotaPolicy{}, fmt.Errorf("unsupported quota resource %q", resource)
	}
	return QuotaPolicy{
		Limit:  quota.Limit,
		Window: time.Duration(quota.Window) * time.Second,
	}, nil
}
