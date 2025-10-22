package rate

import (
	"context"
	"time"

	"github.com/goplus/builder/spx-backend/internal/authz"
)

type nopLimiter struct{}

// NewNopRateLimiter creates an [authz.RateLimiter] that never blocks requests.
func NewNopRateLimiter() authz.RateLimiter {
	return nopLimiter{}
}

// Allow implements authz.RateLimiter.
func (nopLimiter) Allow(ctx context.Context, userID int64, resource authz.Resource, policy authz.RatePolicy) (bool, time.Duration, error) {
 return true, 0, nil
}
