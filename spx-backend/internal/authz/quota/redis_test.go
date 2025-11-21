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

func TestRedisQuotaTrackerTryConsume(t *testing.T) {
	t.Run("Success", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		policy1 := authz.QuotaPolicy{Name: "copilotMessage:limit", Limit: 100, Window: time.Minute}
		policy2 := authz.QuotaPolicy{Name: "copilotMessage:rateLimit:1m", Limit: 10, Window: time.Minute}
		keys := []string{quotaKey(123, policy1), quotaKey(123, policy2)}

		mock.ExpectEvalSha(luaTryConsume.Hash(), keys,
			int64(2), 2,
			policy1.Limit, policy1.Window.Milliseconds(),
			policy2.Limit, policy2.Window.Milliseconds(),
		).SetVal([]any{int64(1)})

		quota, err := tracker.TryConsume(ctx, 123, []authz.QuotaPolicy{policy1, policy2}, 2)
		require.NoError(t, err)
		assert.Nil(t, quota)
		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("Exhausted", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		policy1 := authz.QuotaPolicy{Name: "copilotMessage:limit", Limit: 5, Window: time.Minute}
		policy2 := authz.QuotaPolicy{Name: "copilotMessage:rateLimit:1m", Limit: 3, Window: time.Minute}
		keys := []string{quotaKey(123, policy1), quotaKey(123, policy2)}

		ttlMs := int64(1500)
		used := int64(3)
		mock.ExpectEvalSha(luaTryConsume.Hash(), keys,
			int64(2), 2,
			policy1.Limit, policy1.Window.Milliseconds(),
			policy2.Limit, policy2.Window.Milliseconds(),
		).SetVal([]any{int64(0), int64(2), used, ttlMs})

		quota, err := tracker.TryConsume(ctx, 123, []authz.QuotaPolicy{policy1, policy2}, 2)
		require.NoError(t, err)
		require.NotNil(t, quota)
		assert.Equal(t, policy2.Name, quota.Name)
		assert.Equal(t, used, quota.Used)
		assert.WithinDuration(t, time.Now().Add(time.Duration(ttlMs)*time.Millisecond), quota.ResetTime, 50*time.Millisecond)
		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("ZeroLimit", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		policy := authz.QuotaPolicy{Name: "copilotMessage:limit", Limit: 0, Window: time.Minute}
		keys := []string{quotaKey(123, policy)}

		mock.ExpectEvalSha(luaTryConsume.Hash(), keys,
			int64(1), 1,
			policy.Limit, policy.Window.Milliseconds(),
		).SetVal([]any{int64(0), int64(1), int64(0), int64(0)})

		quota, err := tracker.TryConsume(ctx, 123, []authz.QuotaPolicy{policy}, 1)
		require.NoError(t, err)
		require.NotNil(t, quota)
		assert.Equal(t, policy.Name, quota.Name)
		assert.Equal(t, int64(0), quota.Used)
		assert.True(t, quota.ResetTime.IsZero())
		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("NoPolicies", func(t *testing.T) {
		ctx := context.Background()
		client, _ := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		quota, err := tracker.TryConsume(ctx, 123, nil, 1)
		require.NoError(t, err)
		assert.Nil(t, quota)
	})

	t.Run("ZeroAmount", func(t *testing.T) {
		ctx := context.Background()
		client, _ := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		policy := authz.QuotaPolicy{Name: "copilotMessage:limit", Limit: 100, Window: time.Minute}
		quota, err := tracker.TryConsume(ctx, 123, []authz.QuotaPolicy{policy}, 0)
		require.NoError(t, err)
		assert.Nil(t, quota)
	})

	t.Run("ScriptError", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		tracker := &redisQuotaTracker{client: client}

		policy := authz.QuotaPolicy{Name: "copilotMessage:limit", Limit: 5, Window: time.Minute}
		keys := []string{quotaKey(123, policy)}

		mock.ExpectEvalSha(luaTryConsume.Hash(), keys,
			int64(1), 1,
			policy.Limit, policy.Window.Milliseconds(),
		).SetErr(errors.New("eval error"))

		quota, err := tracker.TryConsume(ctx, 123, []authz.QuotaPolicy{policy}, 1)
		require.Error(t, err)
		assert.Nil(t, quota)
	})
}

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

		usages, err := tracker.Usage(ctx, 123, []authz.QuotaPolicy{policy})
		require.NoError(t, err)
		require.Len(t, usages, 1)
		assert.Equal(t, int64(0), usages[0].Used)
		assert.True(t, usages[0].ResetTime.IsZero())
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

		usages, err := tracker.Usage(ctx, 123, []authz.QuotaPolicy{policy})
		require.NoError(t, err)
		require.Len(t, usages, 1)
		assert.Equal(t, int64(25), usages[0].Used)
		remaining := time.Until(usages[0].ResetTime)
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

		usages, err := tracker.Usage(ctx, 999, []authz.QuotaPolicy{policy})
		require.NoError(t, err)
		require.Len(t, usages, 1)
		assert.Equal(t, int64(0), usages[0].Used)
		assert.True(t, usages[0].ResetTime.IsZero())
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
		usages, err := tracker.Usage(ctx, 123, []authz.QuotaPolicy{policy})
		assert.Error(t, err)
		assert.Nil(t, usages)
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
		usages, err := tracker.Usage(ctx, 123, []authz.QuotaPolicy{policy})
		assert.Error(t, err)
		assert.Nil(t, usages)

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

		err := tracker.ResetUsage(ctx, 123, []authz.QuotaPolicy{policy})
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

		err := tracker.ResetUsage(ctx, 999, []authz.QuotaPolicy{policy})
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

		err := tracker.ResetUsage(ctx, 111, []authz.QuotaPolicy{policy})
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

		err := tracker.ResetUsage(ctx, 123, []authz.QuotaPolicy{policy})
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
