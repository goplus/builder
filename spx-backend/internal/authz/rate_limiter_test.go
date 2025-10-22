package authz

import (
	"context"
	"time"
)

type mockRateLimiter struct {
	allowFunc func(ctx context.Context, userID int64, resource Resource, policy RatePolicy) (bool, time.Duration, error)
}

func (m *mockRateLimiter) Allow(ctx context.Context, userID int64, resource Resource, policy RatePolicy) (bool, time.Duration, error) {
	if m.allowFunc != nil {
		return m.allowFunc(ctx, userID, resource, policy)
	}
	return true, 0, nil
}
