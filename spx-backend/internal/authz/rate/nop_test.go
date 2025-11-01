package rate

import (
	"context"
	"testing"
	"time"

	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/stretchr/testify/assert"
)

func TestNewNopRateLimiter(t *testing.T) {
	limiter := NewNopRateLimiter()
	assert.NotNil(t, limiter)

	allowed, retryAfter, err := limiter.Allow(context.Background(), 1, authz.ResourceCopilotMessage, authz.RatePolicy{
		Limit:  0,
		Window: time.Minute,
	})
	assert.NoError(t, err)
	assert.True(t, allowed)
	assert.Zero(t, retryAfter)
}
