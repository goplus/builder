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
		CanManageAssets:         true,
		CanUsePremiumLLM:        false,
		CopilotMessageQuota:     100,
		CopilotMessageQuotaLeft: 80,
	}, nil
}
