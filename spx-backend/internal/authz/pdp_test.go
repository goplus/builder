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
		CanManageAssets:  true,
		CanUsePremiumLLM: false,
		CopilotMessageQuota: Quota{
			Limit:     100,
			Remaining: 80,
			Window:    24 * 60 * 60,
		},
		AIDescriptionQuota: Quota{
			Limit:     300,
			Remaining: 280,
			Window:    24 * 60 * 60,
		},
		AIInteractionTurnQuota: Quota{
			Limit:     12000,
			Remaining: 11600,
			Window:    24 * 60 * 60,
		},
		AIInteractionArchiveQuota: Quota{
			Limit:     8000,
			Remaining: 7620,
			Window:    24 * 60 * 60,
		},
	}, nil
}
