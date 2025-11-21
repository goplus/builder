package quota

import (
	"context"
	"testing"

	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNopQuotaTrackerTryConsume(t *testing.T) {
	ctx := context.Background()
	tracker := NewNopQuotaTracker()

	quota, err := tracker.TryConsume(ctx, 123, []authz.QuotaPolicy{{Name: "copilotMessage:limit"}}, 10)
	require.NoError(t, err)
	assert.Nil(t, quota)
}

func TestNopQuotaTrackerUsage(t *testing.T) {
	t.Run("AlwaysReturnsZero", func(t *testing.T) {
		ctx := context.Background()
		tracker := NewNopQuotaTracker()

		usages, err := tracker.Usage(ctx, 123, []authz.QuotaPolicy{{Name: "copilotMessage:limit"}})
		require.NoError(t, err)
		require.Len(t, usages, 1)
		assert.Equal(t, int64(0), usages[0].Used)
		assert.True(t, usages[0].ResetTime.IsZero())
	})

	t.Run("DifferentUsersReturnZero", func(t *testing.T) {
		ctx := context.Background()
		tracker := NewNopQuotaTracker()

		usages1, err := tracker.Usage(ctx, 123, []authz.QuotaPolicy{{Name: "copilotMessage:limit"}})
		require.NoError(t, err)
		require.Len(t, usages1, 1)
		assert.Equal(t, int64(0), usages1[0].Used)
		assert.True(t, usages1[0].ResetTime.IsZero())

		usages2, err := tracker.Usage(ctx, 456, []authz.QuotaPolicy{{Name: "copilotMessage:limit"}})
		require.NoError(t, err)
		require.Len(t, usages2, 1)
		assert.Equal(t, int64(0), usages2[0].Used)
		assert.True(t, usages2[0].ResetTime.IsZero())
	})
}

func TestNopQuotaTrackerResetUsage(t *testing.T) {
	t.Run("NoErrorOnReset", func(t *testing.T) {
		ctx := context.Background()
		tracker := NewNopQuotaTracker()

		err := tracker.ResetUsage(ctx, 123, []authz.QuotaPolicy{{Name: "copilotMessage:limit"}})
		require.NoError(t, err)
	})

	t.Run("UsageRemainsZeroAfterReset", func(t *testing.T) {
		ctx := context.Background()
		tracker := NewNopQuotaTracker()

		err := tracker.ResetUsage(ctx, 123, []authz.QuotaPolicy{{Name: "copilotMessage:limit"}})
		require.NoError(t, err)

		usages, err := tracker.Usage(ctx, 123, []authz.QuotaPolicy{{Name: "copilotMessage:limit"}})
		require.NoError(t, err)
		require.Len(t, usages, 1)
		assert.Equal(t, int64(0), usages[0].Used)
		assert.True(t, usages[0].ResetTime.IsZero())
	})
}
