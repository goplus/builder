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
		policy := authz.QuotaPolicy{
			Name:     "copilotMessage:limit",
			Resource: authz.ResourceCopilotMessage,
			Limit:    100,
			Window:   24 * time.Hour,
		}
		key := quotaKey(123, policy)

		mock.ExpectGet(key).RedisNil()
		mock.ExpectPTTL(key).SetVal(0)

		usage, err := tracker.Usage(ctx, 123, policy)
		require.NoError(t, err)
		assert.Equal(t, int64(0), usage.Used)
		assert.True(t, usage.ResetTime.IsZero())
	})

	t.Run("ExistingUsageReturned", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}
		policy := authz.QuotaPolicy{
			Name:     "copilotMessage:limit",
			Resource: authz.ResourceCopilotMessage,
			Limit:    100,
			Window:   24 * time.Hour,
		}
		key := quotaKey(123, policy)
		mock.ExpectGet(key).SetVal("25")
		mock.ExpectPTTL(key).SetVal(30 * time.Second)

		usage, err := tracker.Usage(ctx, 123, policy)
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
		policy := authz.QuotaPolicy{
			Name:     "copilotMessage:limit",
			Resource: authz.ResourceCopilotMessage,
			Limit:    100,
			Window:   24 * time.Hour,
		}
		key := quotaKey(999, policy)

		mock.ExpectGet(key).RedisNil()
		mock.ExpectPTTL(key).SetVal(0)

		usage, err := tracker.Usage(ctx, 999, policy)
		require.NoError(t, err)
		assert.Equal(t, int64(0), usage.Used)
		assert.True(t, usage.ResetTime.IsZero())
	})

	t.Run("RedisError", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}
		policy := authz.QuotaPolicy{
			Name:     "copilotMessage:limit",
			Resource: authz.ResourceCopilotMessage,
			Limit:    100,
			Window:   24 * time.Hour,
		}
		key := quotaKey(123, policy)

		mock.ExpectGet(key).SetErr(errors.New("redis get error"))
		usage, err := tracker.Usage(ctx, 123, policy)
		assert.Error(t, err)
		assert.Equal(t, int64(0), usage.Used)
		assert.True(t, usage.ResetTime.IsZero())
	})

	t.Run("InvalidValueInRedis", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}
		policy := authz.QuotaPolicy{
			Name:     "copilotMessage:limit",
			Resource: authz.ResourceCopilotMessage,
			Limit:    100,
			Window:   24 * time.Hour,
		}
		key := quotaKey(123, policy)

		mock.ExpectGet(key).SetVal("invalid-number")
		usage, err := tracker.Usage(ctx, 123, policy)
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
		policy := authz.QuotaPolicy{
			Name:     "copilotMessage:limit",
			Resource: authz.ResourceCopilotMessage,
			Limit:    100,
			Window:   24 * time.Hour,
		}
		key := quotaKey(123, policy)

		mock.ExpectIncrBy(key, 10).SetVal(10)
		mock.ExpectExpireNX(key, policy.Window).SetVal(true)

		err := tracker.IncrementUsage(ctx, 123, policy, 10)
		require.NoError(t, err)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("MultipleIncrementsAccumulate", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}
		policy := authz.QuotaPolicy{
			Name:     "copilotMessage:limit",
			Resource: authz.ResourceCopilotMessage,
			Limit:    100,
			Window:   24 * time.Hour,
		}
		key := quotaKey(123, policy)

		mock.ExpectIncrBy(key, 10).SetVal(10)
		mock.ExpectExpireNX(key, policy.Window).SetVal(true)
		mock.ExpectIncrBy(key, 5).SetVal(15)
		mock.ExpectExpireNX(key, policy.Window).SetVal(false)

		err := tracker.IncrementUsage(ctx, 123, policy, 10)
		require.NoError(t, err)

		err = tracker.IncrementUsage(ctx, 123, policy, 5)
		require.NoError(t, err)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("DifferentUsersHaveSeparateCounters", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}
		policy := authz.QuotaPolicy{
			Name:     "copilotMessage:limit",
			Resource: authz.ResourceCopilotMessage,
			Limit:    100,
			Window:   24 * time.Hour,
		}
		key123 := quotaKey(123, policy)
		key456 := quotaKey(456, policy)

		mock.ExpectIncrBy(key123, 15).SetVal(15)
		mock.ExpectExpireNX(key123, policy.Window).SetVal(true)
		mock.ExpectIncrBy(key456, 20).SetVal(20)
		mock.ExpectExpireNX(key456, policy.Window).SetVal(true)

		err := tracker.IncrementUsage(ctx, 123, policy, 15)
		require.NoError(t, err)

		err = tracker.IncrementUsage(ctx, 456, policy, 20)
		require.NoError(t, err)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("IncrementError", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}
		policy := authz.QuotaPolicy{
			Name:     "copilotMessage:limit",
			Resource: authz.ResourceCopilotMessage,
			Limit:    100,
			Window:   24 * time.Hour,
		}
		key := quotaKey(123, policy)

		mock.ExpectIncrBy(key, 10).SetErr(errors.New("redis incr error"))
		mock.ExpectExpireNX(key, policy.Window).SetVal(true)

		err := tracker.IncrementUsage(ctx, 123, policy, 10)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to increment usage in Redis")
	})

	t.Run("ExpireError", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}
		policy := authz.QuotaPolicy{
			Name:     "copilotMessage:limit",
			Resource: authz.ResourceCopilotMessage,
			Limit:    100,
			Window:   24 * time.Hour,
		}
		key := quotaKey(123, policy)

		mock.ExpectIncrBy(key, 10).SetVal(10)
		mock.ExpectExpireNX(key, policy.Window).SetErr(errors.New("redis expire error"))

		err := tracker.IncrementUsage(ctx, 123, policy, 10)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to increment usage in Redis")
	})

	t.Run("TTLSetCorrectly", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}
		policy := authz.QuotaPolicy{
			Name:     "copilotMessage:limit",
			Resource: authz.ResourceCopilotMessage,
			Limit:    100,
			Window:   24 * time.Hour,
		}
		key := quotaKey(123, policy)

		wantTTL := policy.Window
		mock.ExpectIncrBy(key, 1).SetVal(1)
		mock.ExpectExpireNX(key, wantTTL).SetVal(true)

		err := tracker.IncrementUsage(ctx, 123, policy, 1)
		require.NoError(t, err)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("ZeroIncrement", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}
		policy := authz.QuotaPolicy{
			Name:     "copilotMessage:limit",
			Resource: authz.ResourceCopilotMessage,
			Limit:    100,
			Window:   24 * time.Hour,
		}
		key := quotaKey(123, policy)

		mock.ExpectIncrBy(key, 0).SetVal(5)
		mock.ExpectExpireNX(key, policy.Window).SetVal(true)

		err := tracker.IncrementUsage(ctx, 123, policy, 0)
		require.NoError(t, err)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("NegativeIncrement", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}
		policy := authz.QuotaPolicy{
			Name:     "copilotMessage:limit",
			Resource: authz.ResourceCopilotMessage,
			Limit:    100,
			Window:   24 * time.Hour,
		}
		key := quotaKey(123, policy)

		mock.ExpectIncrBy(key, -5).SetVal(5)
		mock.ExpectExpireNX(key, policy.Window).SetVal(true)

		err := tracker.IncrementUsage(ctx, 123, policy, -5)
		require.NoError(t, err)

		require.NoError(t, mock.ExpectationsWereMet())
	})
}

func TestRedisQuotaTrackerResetUsage(t *testing.T) {
	t.Run("ResetExistingUsage", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}
		policy := authz.QuotaPolicy{
			Name:     "copilotMessage:limit",
			Resource: authz.ResourceCopilotMessage,
			Limit:    100,
			Window:   24 * time.Hour,
		}

		key := quotaKey(123, policy)
		mock.ExpectDel(key).SetVal(1)

		err := tracker.ResetUsage(ctx, 123, policy)
		require.NoError(t, err)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("ResetNonExistentUsage", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}
		policy := authz.QuotaPolicy{
			Name:     "copilotMessage:limit",
			Resource: authz.ResourceCopilotMessage,
			Limit:    100,
			Window:   24 * time.Hour,
		}

		key := quotaKey(999, policy)
		mock.ExpectDel(key).SetVal(0)

		err := tracker.ResetUsage(ctx, 999, policy)
		require.NoError(t, err)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("ResetOnlyAffectsSpecificUser", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}
		policy := authz.QuotaPolicy{
			Name:     "copilotMessage:limit",
			Resource: authz.ResourceCopilotMessage,
			Limit:    100,
			Window:   24 * time.Hour,
		}

		key := quotaKey(111, policy)
		mock.ExpectDel(key).SetVal(1)

		err := tracker.ResetUsage(ctx, 111, policy)
		require.NoError(t, err)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("RedisError", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}
		policy := authz.QuotaPolicy{
			Name:     "copilotMessage:limit",
			Resource: authz.ResourceCopilotMessage,
			Limit:    100,
			Window:   24 * time.Hour,
		}

		key := quotaKey(123, policy)
		mock.ExpectDel(key).SetErr(errors.New("redis del error"))

		err := tracker.ResetUsage(ctx, 123, policy)
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

func TestQuotaKey(t *testing.T) {
	t.Run("UsesPolicyName", func(t *testing.T) {
		policy := authz.QuotaPolicy{Name: "copilotMessage:limit", Resource: authz.ResourceCopilotMessage}
		key := quotaKey(123, policy)
		assert.Equal(t, "123:copilotMessage:limit", key)
	})

	t.Run("FallsBackToResourceWhenNameEmpty", func(t *testing.T) {
		policy := authz.QuotaPolicy{Name: "", Resource: authz.ResourceAIDescription}
		key := quotaKey(456, policy)
		assert.Equal(t, "456:aiDescription", key)
	})
}
