package quota

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/go-redis/redismock/v9"
	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRedisQuotaTrackerUsage(t *testing.T) {
	t.Run("InitialUsageShouldBeZero", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		mock.ExpectGet("123:copilotMessage").RedisNil()
		mock.ExpectPTTL("123:copilotMessage").SetVal(0)

		usage, err := tracker.Usage(ctx, 123, authz.ResourceCopilotMessage)
		require.NoError(t, err)
		assert.Equal(t, int64(0), usage.Used)
		assert.True(t, usage.ResetTime.IsZero())
	})

	t.Run("ExistingUsageReturned", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		mock.ExpectGet("123:copilotMessage").SetVal("25")
		mock.ExpectPTTL("123:copilotMessage").SetVal(30 * time.Second)

		usage, err := tracker.Usage(ctx, 123, authz.ResourceCopilotMessage)
		require.NoError(t, err)
		assert.Equal(t, int64(25), usage.Used)
		remaining := time.Until(usage.ResetTime)
		assert.Greater(t, remaining, 0*time.Second)
		assert.InDelta(t, float64(30*time.Second), float64(remaining), float64(time.Second))

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("NonExistentUserShouldReturnZero", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		mock.ExpectGet("999:copilotMessage").RedisNil()
		mock.ExpectPTTL("999:copilotMessage").SetVal(0)

		usage, err := tracker.Usage(ctx, 999, authz.ResourceCopilotMessage)
		require.NoError(t, err)
		assert.Equal(t, int64(0), usage.Used)
		assert.True(t, usage.ResetTime.IsZero())
	})

	t.Run("RedisError", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		mock.ExpectGet("123:copilotMessage").SetErr(errors.New("redis get error"))

		usage, err := tracker.Usage(ctx, 123, authz.ResourceCopilotMessage)
		assert.Error(t, err)
		assert.Equal(t, int64(0), usage.Used)
		assert.True(t, usage.ResetTime.IsZero())
	})

	t.Run("InvalidValueInRedis", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		mock.ExpectGet("123:copilotMessage").SetVal("invalid-number")

		usage, err := tracker.Usage(ctx, 123, authz.ResourceCopilotMessage)
		assert.Error(t, err)
		assert.Equal(t, int64(0), usage.Used)
		assert.True(t, usage.ResetTime.IsZero())

		require.NoError(t, mock.ExpectationsWereMet())
	})
}

func TestRedisQuotaTrackerIncrementUsage(t *testing.T) {
	t.Run("SingleIncrement", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}
		policy := authz.QuotaPolicy{Limit: 100, Window: 24 * time.Hour}

		mock.ExpectIncrBy("123:copilotMessage", 10).SetVal(10)
		mock.ExpectExpireNX("123:copilotMessage", policy.Window).SetVal(true)

		err := tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, 10, policy)
		require.NoError(t, err)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("MultipleIncrementsAccumulate", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}
		policy := authz.QuotaPolicy{Limit: 100, Window: 24 * time.Hour}

		mock.ExpectIncrBy("123:copilotMessage", 10).SetVal(10)
		mock.ExpectExpireNX("123:copilotMessage", policy.Window).SetVal(true)
		mock.ExpectIncrBy("123:copilotMessage", 5).SetVal(15)
		mock.ExpectExpireNX("123:copilotMessage", policy.Window).SetVal(false)

		err := tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, 10, policy)
		require.NoError(t, err)

		err = tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, 5, policy)
		require.NoError(t, err)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("DifferentUsersHaveSeparateCounters", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}
		policy := authz.QuotaPolicy{Limit: 100, Window: 24 * time.Hour}

		mock.ExpectIncrBy("123:copilotMessage", 15).SetVal(15)
		mock.ExpectExpireNX("123:copilotMessage", policy.Window).SetVal(true)
		mock.ExpectIncrBy("456:copilotMessage", 20).SetVal(20)
		mock.ExpectExpireNX("456:copilotMessage", policy.Window).SetVal(true)

		err := tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, 15, policy)
		require.NoError(t, err)

		err = tracker.IncrementUsage(ctx, 456, authz.ResourceCopilotMessage, 20, policy)
		require.NoError(t, err)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("IncrementError", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}
		policy := authz.QuotaPolicy{Limit: 100, Window: 24 * time.Hour}

		mock.ExpectIncrBy("123:copilotMessage", 10).SetErr(errors.New("redis incr error"))
		mock.ExpectExpireNX("123:copilotMessage", policy.Window).SetVal(true)

		err := tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, 10, policy)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to increment usage in Redis")
	})

	t.Run("ExpireError", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}
		policy := authz.QuotaPolicy{Limit: 100, Window: 24 * time.Hour}

		mock.ExpectIncrBy("123:copilotMessage", 10).SetVal(10)
		mock.ExpectExpireNX("123:copilotMessage", policy.Window).SetErr(errors.New("redis expire error"))

		err := tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, 10, policy)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to increment usage in Redis")
	})

	t.Run("TTLSetCorrectly", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}
		policy := authz.QuotaPolicy{Limit: 100, Window: 24 * time.Hour}

		wantTTL := policy.Window
		mock.ExpectIncrBy("123:copilotMessage", 1).SetVal(1)
		mock.ExpectExpireNX("123:copilotMessage", wantTTL).SetVal(true)

		err := tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, 1, policy)
		require.NoError(t, err)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("ZeroIncrement", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}
		policy := authz.QuotaPolicy{Limit: 100, Window: 24 * time.Hour}

		mock.ExpectIncrBy("123:copilotMessage", 0).SetVal(5)
		mock.ExpectExpireNX("123:copilotMessage", policy.Window).SetVal(true)

		err := tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, 0, policy)
		require.NoError(t, err)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("NegativeIncrement", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}
		policy := authz.QuotaPolicy{Limit: 100, Window: 24 * time.Hour}

		mock.ExpectIncrBy("123:copilotMessage", -5).SetVal(5)
		mock.ExpectExpireNX("123:copilotMessage", policy.Window).SetVal(true)

		err := tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, -5, policy)
		require.NoError(t, err)

		require.NoError(t, mock.ExpectationsWereMet())
	})
}

func TestRedisQuotaTrackerResetUsage(t *testing.T) {
	t.Run("ResetExistingUsage", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		mock.ExpectDel("123:copilotMessage").SetVal(1)

		err := tracker.ResetUsage(ctx, 123, authz.ResourceCopilotMessage)
		require.NoError(t, err)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("ResetNonExistentUsage", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		mock.ExpectDel("999:copilotMessage").SetVal(0)

		err := tracker.ResetUsage(ctx, 999, authz.ResourceCopilotMessage)
		require.NoError(t, err)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("ResetOnlyAffectsSpecificUser", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		mock.ExpectDel("111:copilotMessage").SetVal(1)

		err := tracker.ResetUsage(ctx, 111, authz.ResourceCopilotMessage)
		require.NoError(t, err)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("RedisError", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		mock.ExpectDel("123:copilotMessage").SetErr(errors.New("redis del error"))

		err := tracker.ResetUsage(ctx, 123, authz.ResourceCopilotMessage)
		assert.Error(t, err)
	})
}

func TestRedisQuotaTrackerClose(t *testing.T) {
	t.Run("CloseSuccess", func(t *testing.T) {
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		err := tracker.Close()
		require.NoError(t, err)

		require.NoError(t, mock.ExpectationsWereMet())
	})
}
