package authz

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockQuotaTracker struct {
	usageFunc          func(ctx context.Context, userID int64, resource Resource) (QuotaUsage, error)
	incrementUsageFunc func(ctx context.Context, userID int64, resource Resource, amount int64, policy QuotaPolicy) error
	resetUsageFunc     func(ctx context.Context, userID int64, resource Resource) error
}

func (m *mockQuotaTracker) Usage(ctx context.Context, userID int64, resource Resource) (QuotaUsage, error) {
	if m.usageFunc != nil {
		return m.usageFunc(ctx, userID, resource)
	}
	return QuotaUsage{Used: 20}, nil
}

func (m *mockQuotaTracker) IncrementUsage(ctx context.Context, userID int64, resource Resource, amount int64, policy QuotaPolicy) error {
	if m.incrementUsageFunc != nil {
		return m.incrementUsageFunc(ctx, userID, resource, amount, policy)
	}
	return nil
}

func (m *mockQuotaTracker) ResetUsage(ctx context.Context, userID int64, resource Resource) error {
	if m.resetUsageFunc != nil {
		return m.resetUsageFunc(ctx, userID, resource)
	}
	return nil
}

func TestQuotaReset(t *testing.T) {
	t.Run("FreshWindowFullRemaining", func(t *testing.T) {
		quota := Quota{
			Limit:     100,
			Remaining: 100,
			Window:    3600,
		}
		assert.Equal(t, int64(3600), quota.Reset())
	})

	t.Run("FreshWindowPartiallyConsumed", func(t *testing.T) {
		quota := Quota{
			Limit:     100,
			Remaining: 80,
			Window:    3600,
		}
		assert.Equal(t, int64(0), quota.Reset())
	})

	t.Run("WithFutureResetTime", func(t *testing.T) {
		quota := Quota{
			ResetTime: time.Now().Add(5 * time.Second),
		}
		got := quota.Reset()
		require.GreaterOrEqual(t, got, int64(4))
		require.LessOrEqual(t, got, int64(5))
	})

	t.Run("WithPastResetTime", func(t *testing.T) {
		quota := Quota{
			ResetTime: time.Now().Add(-1 * time.Second),
		}
		assert.Equal(t, int64(0), quota.Reset())
	})

	t.Run("ZeroWindow", func(t *testing.T) {
		var quota Quota
		assert.Equal(t, int64(0), quota.Reset())
	})
}
