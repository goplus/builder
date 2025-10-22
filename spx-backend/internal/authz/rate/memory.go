package rate

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/goplus/builder/spx-backend/internal/authz"
)

type memoryLimiter struct {
	states sync.Map // key -> *windowState
}

type windowState struct {
	mu          sync.Mutex
	count       int64
	windowStart time.Time
	limit       int64
	window      time.Duration
}

// NewMemoryRateLimiter creates an [authz.RateLimiter] backed by in-process fixed windows.
func NewMemoryRateLimiter() authz.RateLimiter {
	return &memoryLimiter{}
}

// Allow implements authz.RateLimiter.
func (l *memoryLimiter) Allow(ctx context.Context, userID int64, resource authz.Resource, policy authz.RatePolicy) (bool, time.Duration, error) {
	if policy.Limit <= 0 || policy.Window <= 0 {
		return true, 0, nil
	}

	key := fmt.Sprintf("%d:%s", userID, resource)
	stateAny, _ := l.states.LoadOrStore(key, &windowState{
		windowStart: time.Now(),
		limit:       policy.Limit,
		window:      policy.Window,
	})
	state := stateAny.(*windowState)

	state.mu.Lock()
	defer state.mu.Unlock()

	if state.limit != policy.Limit || state.window != policy.Window {
		state.limit = policy.Limit
		state.window = policy.Window
		state.windowStart = time.Now()
		state.count = 0
	}

	now := time.Now()
	if now.Sub(state.windowStart) >= state.window {
		state.windowStart = now
		state.count = 0
	}

	if state.count < state.limit {
		state.count++
		return true, 0, nil
	}

	retryAfter := state.window - now.Sub(state.windowStart)
	if retryAfter < 0 {
		retryAfter = 0
	}
	return false, retryAfter, nil
}
