package authz

import (
	"context"
	"time"
)

// RatePolicy describes the rate limiting parameters for a resource.
type RatePolicy struct {
	Limit  int64
	Window time.Duration
}

// RateLimiter defines the interface for enforcing short-term request limits.
type RateLimiter interface {
	// Allow reports whether the user can access the resource given the provided
	// policy. When denied, it returns the remaining cooldown before retry in the
	// second return value.
	Allow(ctx context.Context, userID int64, resource Resource, policy RatePolicy) (bool, time.Duration, error)
}
