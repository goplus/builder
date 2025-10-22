package rate

import (
	"context"
	"testing"
	"time"

	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMemoryLimiterAllow(t *testing.T) {
	ctx := context.Background()
	limiter := NewMemoryRateLimiter()
	policy := authz.RatePolicy{Limit: 3, Window: 100 * time.Millisecond}

	for i := 0; i < 3; i++ {
		allowed, retry, err := limiter.Allow(ctx, 1, authz.ResourceCopilotMessage, policy)
		require.NoError(t, err)
		assert.True(t, allowed)
		assert.Zero(t, retry)
	}

	allowed, retry, err := limiter.Allow(ctx, 1, authz.ResourceCopilotMessage, policy)
	require.NoError(t, err)
	assert.False(t, allowed)
	assert.Greater(t, retry, time.Duration(0))
}

func TestMemoryLimiterWindowReset(t *testing.T) {
	ctx := context.Background()
	limiter := NewMemoryRateLimiter()
	policy := authz.RatePolicy{Limit: 2, Window: 50 * time.Millisecond}

	for i := 0; i < 2; i++ {
		allowed, _, err := limiter.Allow(ctx, 2, authz.ResourceAIDescription, policy)
		require.NoError(t, err)
		assert.True(t, allowed)
	}

	allowed, retry, err := limiter.Allow(ctx, 2, authz.ResourceAIDescription, policy)
	require.NoError(t, err)
	assert.False(t, allowed)
	assert.Greater(t, retry, time.Duration(0))

	time.Sleep(60 * time.Millisecond)

	allowed, retry, err = limiter.Allow(ctx, 2, authz.ResourceAIDescription, policy)
	require.NoError(t, err)
	assert.True(t, allowed)
	assert.Zero(t, retry)
}
