package rate

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/go-redis/redismock/v9"
	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRedisRateLimiterAllow(t *testing.T) {
	t.Run("WithinLimit", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		limiter := &redisRateLimiter{client: client}

		windowIndex := fmt.Sprintf("%d", time.Now().UnixNano()/int64(time.Minute))
		redisKey := fmt.Sprintf("rate:%d:%s:%s", 123, authz.ResourceCopilotMessage, windowIndex)

		mock.ExpectTxPipeline()
		mock.ExpectIncr(redisKey).SetVal(1)
		mock.ExpectExpire(redisKey, time.Minute+time.Second).SetVal(true)
		mock.ExpectTxPipelineExec()

		allowed, retryAfter, err := limiter.Allow(ctx, 123, authz.ResourceCopilotMessage, authz.RatePolicy{Limit: 30, Window: time.Minute})
		require.NoError(t, err)
		assert.True(t, allowed)
		assert.Zero(t, retryAfter)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("ExceededLimit", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		limiter := &redisRateLimiter{client: client}

		policy := authz.RatePolicy{Limit: 2, Window: time.Minute}
		windowIndex := fmt.Sprintf("%d", time.Now().UnixNano()/int64(policy.Window))
		redisKey := fmt.Sprintf("rate:%d:%s:%s", 88, authz.ResourceCopilotMessage, windowIndex)

		mock.ExpectTxPipeline()
		mock.ExpectIncr(redisKey).SetVal(3)
		mock.ExpectExpire(redisKey, policy.Window+time.Second).SetVal(true)
		mock.ExpectTxPipelineExec()

		allowed, retryAfter, err := limiter.Allow(ctx, 88, authz.ResourceCopilotMessage, policy)
		require.NoError(t, err)
		assert.False(t, allowed)
		assert.NotZero(t, retryAfter)

		require.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("RedisError", func(t *testing.T) {
		ctx := context.Background()
		client, mock := redismock.NewClientMock()
		limiter := &redisRateLimiter{client: client}

		policy := authz.RatePolicy{Limit: 5, Window: time.Minute}
		windowIndex := fmt.Sprintf("%d", time.Now().UnixNano()/int64(policy.Window))
		redisKey := fmt.Sprintf("rate:%d:%s:%s", 7, authz.ResourceCopilotMessage, windowIndex)

		mock.ExpectTxPipeline()
		mock.ExpectIncr(redisKey).SetErr(assert.AnError)
		mock.ExpectExpire(redisKey, policy.Window+time.Second).SetVal(true)
		mock.ExpectTxPipelineExec()

		allowed, _, err := limiter.Allow(ctx, 7, authz.ResourceCopilotMessage, policy)
		assert.Error(t, err)
		assert.False(t, allowed)
	})
}

func TestRedisRateLimiterClose(t *testing.T) {
	client, mock := redismock.NewClientMock()
	limiter := &redisRateLimiter{client: client}

	err := limiter.Close()
	require.NoError(t, err)

	require.NoError(t, mock.ExpectationsWereMet())
}
