package authz

import (
	"context"
	"time"

	"github.com/goplus/builder/spx-backend/internal/model"
)

type mockPolicyDecisionPoint struct {
	computeUserCapabilitiesFunc func(ctx context.Context, mUser *model.User) (UserCapabilities, error)
	computeUserQuotasFunc       func(ctx context.Context, mUser *model.User) (UserQuotas, error)
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

func (m *mockPolicyDecisionPoint) ComputeUserQuotas(ctx context.Context, mUser *model.User) (UserQuotas, error) {
	if m.computeUserQuotasFunc != nil {
		return m.computeUserQuotasFunc(ctx, mUser)
	}
	return UserQuotas{
		Limits: map[Resource]Quota{
			ResourceCopilotMessage: {
				QuotaPolicy: QuotaPolicy{Limit: 100, Window: 24 * time.Hour},
				QuotaUsage:  QuotaUsage{Used: 20},
			},
			ResourceAIDescription: {
				QuotaPolicy: QuotaPolicy{Limit: 300, Window: 24 * time.Hour},
				QuotaUsage:  QuotaUsage{Used: 20},
			},
			ResourceAIInteractionTurn: {
				QuotaPolicy: QuotaPolicy{Limit: 12000, Window: 24 * time.Hour},
				QuotaUsage:  QuotaUsage{Used: 400},
			},
			ResourceAIInteractionArchive: {
				QuotaPolicy: QuotaPolicy{Limit: 8000, Window: 24 * time.Hour},
				QuotaUsage:  QuotaUsage{Used: 380},
			},
		},
	}, nil
}
