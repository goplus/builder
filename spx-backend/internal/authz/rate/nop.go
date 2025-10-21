package rate

import (
	"context"
	"time"

	"github.com/goplus/builder/spx-backend/internal/authz"
)

// nopRateLimiter implements [authz.RateLimiter] with no-op functionality.
type nopRateLimiter struct{}

// NewNopRateLimiter creates a new no-op rate limiter.
func NewNopRateLimiter() authz.RateLimiter {
	return nopRateLimiter{}
}

// Allow implements [authz.RateLimiter].
func (nopRateLimiter) Allow(ctx context.Context, userID int64, resource authz.Resource, policy authz.RatePolicy) (bool, time.Duration, error) {
	return true, 0, nil
}
