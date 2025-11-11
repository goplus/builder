package authz

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockQuotaTracker struct {
	usageFunc          func(ctx context.Context, userID int64, policy QuotaPolicy) (QuotaUsage, error)
	incrementUsageFunc func(ctx context.Context, userID int64, policy QuotaPolicy, amount int64) error
	resetUsageFunc     func(ctx context.Context, userID int64, policy QuotaPolicy) error
}

func (m *mockQuotaTracker) Usage(ctx context.Context, userID int64, policy QuotaPolicy) (QuotaUsage, error) {
	if m.usageFunc != nil {
		return m.usageFunc(ctx, userID, policy)
	}
	return QuotaUsage{Used: 20}, nil
}

func (m *mockQuotaTracker) IncrementUsage(ctx context.Context, userID int64, policy QuotaPolicy, amount int64) error {
	if m.incrementUsageFunc != nil {
		return m.incrementUsageFunc(ctx, userID, policy, amount)
	}
	return nil
}

func (m *mockQuotaTracker) ResetUsage(ctx context.Context, userID int64, policy QuotaPolicy) error {
	if m.resetUsageFunc != nil {
		return m.resetUsageFunc(ctx, userID, policy)
	}
	return nil
}

func TestQuotaReset(t *testing.T) {
	t.Run("FreshWindowFullRemaining", func(t *testing.T) {
		quota := Quota{
			QuotaPolicy: QuotaPolicy{Limit: 100, Window: 3600 * time.Second},
		}
		assert.Equal(t, int64(3600), quota.Reset())
	})

	t.Run("FreshWindowPartiallyConsumed", func(t *testing.T) {
		quota := Quota{
			QuotaPolicy: QuotaPolicy{Limit: 100, Window: 3600 * time.Second},
			QuotaUsage:  QuotaUsage{Used: 20},
		}
		assert.Equal(t, int64(0), quota.Reset())
	})

	t.Run("WithFutureResetTime", func(t *testing.T) {
		quota := Quota{
			QuotaUsage: QuotaUsage{
				ResetTime: time.Now().Add(5 * time.Second),
			},
		}
		got := quota.Reset()
		require.GreaterOrEqual(t, got, int64(4))
		require.LessOrEqual(t, got, int64(5))
	})

	t.Run("WithPastResetTime", func(t *testing.T) {
		quota := Quota{
			QuotaUsage: QuotaUsage{
				ResetTime: time.Now().Add(-1 * time.Second),
			},
		}
		assert.Equal(t, int64(0), quota.Reset())
	})

	t.Run("ZeroWindow", func(t *testing.T) {
		var quota Quota
		assert.Equal(t, int64(0), quota.Reset())
	})
}

func TestQuotaRemaining(t *testing.T) {
	for _, tt := range []struct {
		name  string
		quota Quota
		want  int64
	}{
		{
			name: "WithinLimit",
			quota: Quota{
				QuotaPolicy: QuotaPolicy{Limit: 100},
				QuotaUsage:  QuotaUsage{Used: 20},
			},
			want: 80,
		},
		{
			name: "OverLimit",
			quota: Quota{
				QuotaPolicy: QuotaPolicy{Limit: 50},
				QuotaUsage:  QuotaUsage{Used: 80},
			},
			want: 0,
		},
		{
			name: "Unlimited",
			quota: Quota{
				QuotaPolicy: QuotaPolicy{Limit: 0},
			},
			want: 0,
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, tt.quota.Remaining())
		})
	}
}

func TestCeilSeconds(t *testing.T) {
	for _, tt := range []struct {
		name string
		d    time.Duration
		want int64
	}{
		{
			name: "Zero",
			d:    0,
			want: 0,
		},
		{
			name: "Negative",
			d:    -500 * time.Millisecond,
			want: 0,
		},
		{
			name: "ExactSecond",
			d:    2 * time.Second,
			want: 2,
		},
		{
			name: "Fractional",
			d:    1500 * time.Millisecond,
			want: 2,
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got := ceilSeconds(tt.d)
			assert.Equal(t, tt.want, got)
		})
	}
}
