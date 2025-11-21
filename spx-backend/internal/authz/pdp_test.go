package authz

import (
	"context"
	"time"

	"github.com/goplus/builder/spx-backend/internal/model"
)

type mockPolicyDecisionPoint struct {
	computeUserCapabilitiesFunc  func(ctx context.Context, mUser *model.User) (UserCapabilities, error)
	computeUserQuotaPoliciesFunc func(ctx context.Context, mUser *model.User) (UserQuotaPolicies, error)
}

func (m *mockPolicyDecisionPoint) ComputeUserCapabilities(ctx context.Context, mUser *model.User) (UserCapabilities, error) {
	if m.computeUserCapabilitiesFunc != nil {
		return m.computeUserCapabilitiesFunc(ctx, mUser)
	}
	return UserCapabilities{
		CanManageAssets:  true,
		CanManageCourses: false,
		CanUsePremiumLLM: false,
	}, nil
}

func (m *mockPolicyDecisionPoint) ComputeUserQuotaPolicies(ctx context.Context, mUser *model.User) (UserQuotaPolicies, error) {
	if m.computeUserQuotaPoliciesFunc != nil {
		return m.computeUserQuotaPoliciesFunc(ctx, mUser)
	}
	return UserQuotaPolicies{
		Limits: map[Resource]QuotaPolicy{
			ResourceCopilotMessage:       {Limit: 100, Window: 24 * time.Hour},
			ResourceAIDescription:        {Limit: 300, Window: 24 * time.Hour},
			ResourceAIInteractionTurn:    {Limit: 12000, Window: 24 * time.Hour},
			ResourceAIInteractionArchive: {Limit: 8000, Window: 24 * time.Hour},
		},
	}, nil
}
