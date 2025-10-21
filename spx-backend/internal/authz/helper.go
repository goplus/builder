package authz

import (
	"context"
	"errors"
	"time"

	"github.com/goplus/builder/spx-backend/internal/authn"
)

var (
	errMissingAuthorizer        = errors.New("missing authorizer in context")
	errMissingAuthenticatedUser = errors.New("missing authenticated user in context")
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
		return errMissingAuthorizer
	}
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return errMissingAuthenticatedUser
	}
	return authorizer.quotaTracker.IncrementUsage(ctx, mUser.ID, resource, amount)
}

// AllowRateLimit checks if the user passes the rate limiter for the resource.
func AllowRateLimit(ctx context.Context, resource Resource) (bool, time.Duration, error) {
	authorizer, ok := authorizerFromContext(ctx)
	if !ok {
		return false, 0, errMissingAuthorizer
	}
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return false, 0, errMissingAuthenticatedUser
	}
	caps, ok := UserCapabilitiesFromContext(ctx)
	if !ok {
		return true, 0, nil
	}
	policy := ratePolicyFromCapabilities(caps, resource)
	if policy.Limit <= 0 || policy.Window <= 0 {
		return true, 0, nil
	}
	return authorizer.rateLimiter.Allow(ctx, mUser.ID, resource, policy)
}

// ratePolicyFromCapabilities returns the rate limiting policy derived from the
// provided user capabilities.
func ratePolicyFromCapabilities(caps UserCapabilities, resource Resource) RatePolicy {
	switch resource {
	case ResourceCopilotMessage:
		return RatePolicy{
			Limit:  caps.CopilotMessageRateLimit,
			Window: time.Duration(caps.CopilotMessageRateWindowSeconds) * time.Second,
		}
	case ResourceAIDescription:
		return RatePolicy{
			Limit:  caps.AIDescriptionRateLimit,
			Window: time.Duration(caps.AIDescriptionRateWindowSeconds) * time.Second,
		}
	case ResourceAIInteractionTurn:
		return RatePolicy{
			Limit:  caps.AIInteractionTurnRateLimit,
			Window: time.Duration(caps.AIInteractionTurnRateWindowSeconds) * time.Second,
		}
	case ResourceAIInteractionArchive:
		return RatePolicy{
			Limit:  caps.AIInteractionArchiveRateLimit,
			Window: time.Duration(caps.AIInteractionArchiveRateWindowSeconds) * time.Second,
		}
	default:
		return RatePolicy{}
	}
}
