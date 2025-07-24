package embpdp

import (
	"context"
	"fmt"
	"slices"

	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/model"
)

// embeddedPDP implements authz.PolicyDecisionPoint with embedded authorization policies.
type embeddedPDP struct {
	quotaTracker authz.QuotaTracker
}

// New creates a new embedded PDP.
func New(quotaTracker authz.QuotaTracker) authz.PolicyDecisionPoint {
	return &embeddedPDP{
		quotaTracker: quotaTracker,
	}
}

// ComputeUserCapabilities implements authz.PolicyDecisionPoint.
func (p *embeddedPDP) ComputeUserCapabilities(ctx context.Context, mUser *model.User) (authz.UserCapabilities, error) {
	caps := authz.UserCapabilities{
		CanManageAssets:     p.hasRole(mUser, userRoleAssetAdmin),
		CanManageCourses:    p.hasRole(mUser, userRoleCourseAdmin),
		CanUsePremiumLLM:    p.hasPlusPlan(mUser),
		CopilotMessageQuota: p.getCopilotQuota(mUser),
	}
	usage, err := p.quotaTracker.Usage(ctx, mUser.ID, authz.ResourceCopilotMessage)
	if err != nil {
		return authz.UserCapabilities{}, fmt.Errorf("failed to retrieve copilot message quota usage for user %q: %w", mUser.Username, err)
	}
	caps.CopilotMessageQuotaLeft = max(caps.CopilotMessageQuota-usage, 0)
	return caps, nil
}

// userRole represents a user role in the system.
type userRole string

const (
	userRoleAssetAdmin  userRole = "assetAdmin"
	userRoleCourseAdmin userRole = "courseAdmin"
)

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

// getCopilotQuota returns the appropriate quota based on user plan.
func (p *embeddedPDP) getCopilotQuota(mUser *model.User) int64 {
	switch mUser.Plan {
	case model.UserPlanPlus:
		return 1000
	default:
		return 100
	}
}
