package authz

import "context"

type mockQuotaTracker struct {
	usageFunc          func(ctx context.Context, userID int64, resource Resource) (int64, error)
	incrementUsageFunc func(ctx context.Context, userID int64, resource Resource, amount int64) error
	resetUsageFunc     func(ctx context.Context, userID int64, resource Resource) error
}

func (m *mockQuotaTracker) Usage(ctx context.Context, userID int64, resource Resource) (int64, error) {
	if m.usageFunc != nil {
		return m.usageFunc(ctx, userID, resource)
	}
	return 20, nil
}

func (m *mockQuotaTracker) IncrementUsage(ctx context.Context, userID int64, resource Resource, amount int64) error {
	if m.incrementUsageFunc != nil {
		return m.incrementUsageFunc(ctx, userID, resource, amount)
	}
	return nil
}

func (m *mockQuotaTracker) ResetUsage(ctx context.Context, userID int64, resource Resource) error {
	if m.resetUsageFunc != nil {
		return m.resetUsageFunc(ctx, userID, resource)
	}
	return nil
}
