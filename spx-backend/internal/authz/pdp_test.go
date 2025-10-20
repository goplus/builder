package authz

import (
	"context"

	"github.com/goplus/builder/spx-backend/internal/model"
)

type mockPolicyDecisionPoint struct {
	computeUserCapabilitiesFunc func(ctx context.Context, mUser *model.User) (UserCapabilities, error)
}

func (m *mockPolicyDecisionPoint) ComputeUserCapabilities(ctx context.Context, mUser *model.User) (UserCapabilities, error) {
	if m.computeUserCapabilitiesFunc != nil {
		return m.computeUserCapabilitiesFunc(ctx, mUser)
	}
	return UserCapabilities{
		CanManageAssets:               true,
		CanUsePremiumLLM:              false,
		CopilotMessageQuota:           100,
		CopilotMessageQuotaLeft:       80,
		AIDescriptionQuota:            300,
		AIDescriptionQuotaLeft:        280,
		AIInteractionTurnQuota:        12000,
		AIInteractionTurnQuotaLeft:    11600,
		AIInteractionArchiveQuota:     8000,
		AIInteractionArchiveQuotaLeft: 7620,
	}, nil
}
