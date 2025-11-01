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
		CanManageAssets:                       true,
		CanUsePremiumLLM:                      false,
		CopilotMessageQuota:                   100,
		CopilotMessageQuotaLeft:               80,
		CopilotMessageRateLimit:               30,
		CopilotMessageRateWindowSeconds:       60,
		AIDescriptionQuota:                    300,
		AIDescriptionQuotaLeft:                280,
		AIDescriptionRateLimit:                10,
		AIDescriptionRateWindowSeconds:        60,
		AIInteractionTurnQuota:                12000,
		AIInteractionTurnQuotaLeft:            11600,
		AIInteractionTurnRateLimit:            20,
		AIInteractionTurnRateWindowSeconds:    60,
		AIInteractionArchiveQuota:             8000,
		AIInteractionArchiveQuotaLeft:         7620,
		AIInteractionArchiveRateLimit:         10,
		AIInteractionArchiveRateWindowSeconds: 60,
	}, nil
}
