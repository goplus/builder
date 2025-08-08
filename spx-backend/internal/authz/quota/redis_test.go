package quota

import (
	"context"
	"testing"

	"github.com/go-redis/redismock/v9"
	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRedisQuotaTrackerUsage(t *testing.T) {
	t.Run("InitialUsageShouldBeZero", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		mock.ExpectGet("123:copilotMessage").RedisNil()

		usage, err := tracker.Usage(ctx, 123, authz.ResourceCopilotMessage)
		require.NoError(t, err)
		assert.Equal(t, int64(0), usage)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("ExistingUsageReturned", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		mock.ExpectGet("123:copilotMessage").SetVal("25")

		usage, err := tracker.Usage(ctx, 123, authz.ResourceCopilotMessage)
		require.NoError(t, err)
		assert.Equal(t, int64(25), usage)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("NonExistentUserShouldReturnZero", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		mock.ExpectGet("999:copilotMessage").RedisNil()

		usage, err := tracker.Usage(ctx, 999, authz.ResourceCopilotMessage)
		require.NoError(t, err)
		assert.Equal(t, int64(0), usage)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("RedisError", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		mock.ExpectGet("123:copilotMessage").SetErr(redis.NewClient(&redis.Options{}).Ping(ctx).Err())

		usage, err := tracker.Usage(ctx, 123, authz.ResourceCopilotMessage)
		assert.Error(t, err)
		assert.Equal(t, int64(0), usage)
	})

	t.Run("InvalidValueInRedis", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		mock.ExpectGet("123:copilotMessage").SetVal("invalid-number")

		usage, err := tracker.Usage(ctx, 123, authz.ResourceCopilotMessage)
		assert.Error(t, err)
		assert.Equal(t, int64(0), usage)

		require.NoError(t, mock.ExpectationsWereMet())
	})
}

func TestRedisQuotaTrackerIncrementUsage(t *testing.T) {
	t.Run("SingleIncrement", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		mock.ExpectIncrBy("123:copilotMessage", 10).SetVal(10)
		mock.ExpectExpire("123:copilotMessage", quotaTTL).SetVal(true)

		err := tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, 10)
		require.NoError(t, err)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("MultipleIncrementsAccumulate", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		mock.ExpectIncrBy("123:copilotMessage", 10).SetVal(10)
		mock.ExpectExpire("123:copilotMessage", quotaTTL).SetVal(true)
		mock.ExpectIncrBy("123:copilotMessage", 5).SetVal(15)
		mock.ExpectExpire("123:copilotMessage", quotaTTL).SetVal(true)

		err := tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, 10)
		require.NoError(t, err)

		err = tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, 5)
		require.NoError(t, err)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("DifferentUsersHaveSeparateCounters", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		mock.ExpectIncrBy("123:copilotMessage", 15).SetVal(15)
		mock.ExpectExpire("123:copilotMessage", quotaTTL).SetVal(true)
		mock.ExpectIncrBy("456:copilotMessage", 20).SetVal(20)
		mock.ExpectExpire("456:copilotMessage", quotaTTL).SetVal(true)

		err := tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, 15)
		require.NoError(t, err)

		err = tracker.IncrementUsage(ctx, 456, authz.ResourceCopilotMessage, 20)
		require.NoError(t, err)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("IncrementError", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		mock.ExpectIncrBy("123:copilotMessage", 10).SetErr(redis.NewClient(&redis.Options{}).Ping(ctx).Err())
		mock.ExpectExpire("123:copilotMessage", quotaTTL).SetVal(true)

		err := tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, 10)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to increment usage in Redis")
	})

	t.Run("ExpireError", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		mock.ExpectIncrBy("123:copilotMessage", 10).SetVal(10)
		mock.ExpectExpire("123:copilotMessage", quotaTTL).SetErr(redis.NewClient(&redis.Options{}).Ping(ctx).Err())

		err := tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, 10)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to increment usage in Redis")
	})

	t.Run("TTLSetCorrectly", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		wantTTL := quotaTTL
		mock.ExpectIncrBy("123:copilotMessage", 1).SetVal(1)
		mock.ExpectExpire("123:copilotMessage", wantTTL).SetVal(true)

		err := tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, 1)
		require.NoError(t, err)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("ZeroIncrement", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		mock.ExpectIncrBy("123:copilotMessage", 0).SetVal(5)
		mock.ExpectExpire("123:copilotMessage", quotaTTL).SetVal(true)

		err := tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, 0)
		require.NoError(t, err)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("NegativeIncrement", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		mock.ExpectIncrBy("123:copilotMessage", -5).SetVal(5)
		mock.ExpectExpire("123:copilotMessage", quotaTTL).SetVal(true)

		err := tracker.IncrementUsage(ctx, 123, authz.ResourceCopilotMessage, -5)
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

		mock.ExpectDel("123:copilotMessage").SetErr(redis.NewClient(&redis.Options{}).Ping(ctx).Err())

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
