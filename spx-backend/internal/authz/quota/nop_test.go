package quota

import (
	"context"
	"testing"

	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNopQuotaTrackerUsage(t *testing.T) {
	t.Run("AlwaysReturnsZero", func(t *testing.T) {
		ctx := context.Background()
		tracker := NewNopQuotaTracker()

		usage, err := tracker.Usage(ctx, 123, authz.QuotaPolicy{Name: "copilotMessage:limit"})
		require.NoError(t, err)
		assert.Equal(t, int64(0), usage.Used)
		assert.True(t, usage.ResetTime.IsZero())
	})

	t.Run("DifferentUsersReturnZero", func(t *testing.T) {
		ctx := context.Background()
		tracker := NewNopQuotaTracker()

		usage1, err := tracker.Usage(ctx, 123, authz.QuotaPolicy{Name: "copilotMessage:limit"})
		require.NoError(t, err)
		assert.Equal(t, int64(0), usage1.Used)
		assert.True(t, usage1.ResetTime.IsZero())

		usage2, err := tracker.Usage(ctx, 456, authz.QuotaPolicy{Name: "copilotMessage:limit"})
		require.NoError(t, err)
		assert.Equal(t, int64(0), usage2.Used)
		assert.True(t, usage2.ResetTime.IsZero())
	})
}

func TestNopQuotaTrackerResetUsage(t *testing.T) {
	t.Run("NoErrorOnReset", func(t *testing.T) {
		ctx := context.Background()
		tracker := NewNopQuotaTracker()

		err := tracker.ResetUsage(ctx, 123, authz.QuotaPolicy{Name: "copilotMessage:limit"})
		require.NoError(t, err)
	})

	t.Run("UsageRemainsZeroAfterReset", func(t *testing.T) {
		ctx := context.Background()
		tracker := NewNopQuotaTracker()

		err := tracker.ResetUsage(ctx, 123, authz.QuotaPolicy{Name: "copilotMessage:limit"})
		require.NoError(t, err)

		usage, err := tracker.Usage(ctx, 123, authz.QuotaPolicy{Name: "copilotMessage:limit"})
		require.NoError(t, err)
		assert.Equal(t, int64(0), usage.Used)
		assert.True(t, usage.ResetTime.IsZero())
	})
}

func TestNopQuotaTrackerTryConsume(t *testing.T) {
	ctx := context.Background()
	tracker := NewNopQuotaTracker()

	quota, err := tracker.TryConsume(ctx, 123, []authz.QuotaPolicy{{Name: "copilotMessage:limit"}}, 10)
	require.NoError(t, err)
	assert.Nil(t, quota)
}
