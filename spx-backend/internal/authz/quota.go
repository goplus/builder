package authz

import (
	"context"
	"time"
)

// QuotaTracker defines the interface for tracking resource usage quotas.
type QuotaTracker interface {
	// Usage returns the current usage for a user and quota policy.
	Usage(ctx context.Context, userID int64, policy QuotaPolicy) (QuotaUsage, error)

	// ResetUsage resets the usage counter for a user and quota policy.
	ResetUsage(ctx context.Context, userID int64, policy QuotaPolicy) error

	// TryConsume tries to consume the given amount of quotas across all
	// provided quota policies in one atomic step. It returns a non-nil
	// [*Quota] only when consumption would exceed that quota and no system
	// failure occurs.
	TryConsume(ctx context.Context, userID int64, policies []QuotaPolicy, amount int64) (*Quota, error)
}

// QuotaPolicy defines the quota configuration for a usage update.
type QuotaPolicy struct {
	// Name is the unique identifier for tracking usage.
	Name string

	// Resource is the governed logical resource.
	Resource Resource

	// Limit is the maximum allowed usage within the quota window.
	Limit int64

	// Window is the duration of the quota window.
	Window time.Duration
}

// QuotaUsage captures consumption and reset information reported by trackers.
type QuotaUsage struct {
	// Used is the amount of quota consumed within the current window.
	Used int64

	// ResetTime is the time when the current quota window resets.
	ResetTime time.Time
}

// Quota represents quota limits and usage counters for a resource.
type Quota struct {
	QuotaPolicy
	QuotaUsage
}

// Remaining returns the unused quota for the current window.
func (q Quota) Remaining() int64 {
	if q.Limit <= 0 {
		return 0
	}
	return max(q.Limit-q.Used, 0)
}

// Reset returns the remaining time in seconds before the window resets.
func (q Quota) Reset() int64 {
	if q.Limit <= 0 {
		return 0
	}
	if q.ResetTime.IsZero() {
		if q.Window > 0 && q.Used == 0 {
			return ceilSeconds(q.Window)
		}
		return 0
	}
	return ceilSeconds(time.Until(q.ResetTime))
}

// Resource represents different types of resources that can be metered and tracked.
type Resource string

const (
	ResourceCopilotMessage       Resource = "copilotMessage"
	ResourceAIDescription        Resource = "aiDescription"
	ResourceAIInteractionTurn    Resource = "aiInteractionTurn"
	ResourceAIInteractionArchive Resource = "aiInteractionArchive"
)

// ceilSeconds converts a [time.Duration] to seconds rounded up. It returns 0 if
// d <= 0.
func ceilSeconds(d time.Duration) int64 {
	if d <= 0 {
		return 0
	}
	return int64((d + time.Second - 1) / time.Second)
}
