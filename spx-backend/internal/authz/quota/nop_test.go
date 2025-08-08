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

		usage, err := tracker.Usage(ctx, 123, authz.ResourceCopilotMessage)
		require.NoError(t, err)
		assert.Equal(t, int64(0), usage)
	})

	t.Run("DifferentUsersReturnZero", func(t *testing.T) {
		ctx := context.Background()
		tracker := NewNopQuotaTracker()

		usage1, err := tracker.Usage(ctx, 123, authz.ResourceCopilotMessage)
		require.NoError(t, err)
		assert.Equal(t, int64(0), usage1)

		usage2, err := tracker.Usage(ctx, 456, authz.ResourceCopilotMessage)
		require.NoError(t, err)
		assert.Equal(t, int64(0), usage2)
	})
}

func TestNopQuotaTrackerIncrementUsage(t *testing.T) {
	t.Run("NoErrorOnIncrement", func(t *testing.T) {
		ctx := context.Background()
		tracker := NewNopQuotaTracker()

		err := tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, 10)
		require.NoError(t, err)
	})

	t.Run("UsageRemainsZeroAfterIncrement", func(t *testing.T) {
		ctx := context.Background()
		tracker := NewNopQuotaTracker()

		err := tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, 10)
		require.NoError(t, err)

		usage, err := tracker.Usage(ctx, 123, authz.ResourceCopilotMessage)
		require.NoError(t, err)
		assert.Equal(t, int64(0), usage)
	})

	t.Run("MultipleIncrementsHaveNoEffect", func(t *testing.T) {
		ctx := context.Background()
		tracker := NewNopQuotaTracker()

		err := tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, 5)
		require.NoError(t, err)

		err = tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, 15)
		require.NoError(t, err)

		usage, err := tracker.Usage(ctx, 123, authz.ResourceCopilotMessage)
		require.NoError(t, err)
		assert.Equal(t, int64(0), usage)
	})

	t.Run("ZeroIncrement", func(t *testing.T) {
		ctx := context.Background()
		tracker := NewNopQuotaTracker()

		err := tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, 0)
		require.NoError(t, err)
	})

	t.Run("NegativeIncrement", func(t *testing.T) {
		ctx := context.Background()
		tracker := NewNopQuotaTracker()

		err := tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, -5)
		require.NoError(t, err)
	})
}

func TestNopQuotaTrackerResetUsage(t *testing.T) {
	t.Run("NoErrorOnReset", func(t *testing.T) {
		ctx := context.Background()
		tracker := NewNopQuotaTracker()

		err := tracker.ResetUsage(ctx, 123, authz.ResourceCopilotMessage)
		require.NoError(t, err)
	})

	t.Run("UsageRemainsZeroAfterReset", func(t *testing.T) {
		ctx := context.Background()
		tracker := NewNopQuotaTracker()

		err := tracker.ResetUsage(ctx, 123, authz.ResourceCopilotMessage)
		require.NoError(t, err)

		usage, err := tracker.Usage(ctx, 123, authz.ResourceCopilotMessage)
		require.NoError(t, err)
		assert.Equal(t, int64(0), usage)
	})

	t.Run("ResetAfterIncrementHasNoEffect", func(t *testing.T) {
		ctx := context.Background()
		tracker := NewNopQuotaTracker()

		err := tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, 100)
		require.NoError(t, err)

		err = tracker.ResetUsage(ctx, 123, authz.ResourceCopilotMessage)
		require.NoError(t, err)

		usage, err := tracker.Usage(ctx, 123, authz.ResourceCopilotMessage)
		require.NoError(t, err)
		assert.Equal(t, int64(0), usage)
	})
}
