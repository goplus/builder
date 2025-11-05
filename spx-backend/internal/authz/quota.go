package authz

import (
	"context"
	"time"
)

// QuotaTracker defines the interface for tracking resource usage quotas.
type QuotaTracker interface {
	// Usage returns the current usage for a user and resource.
	Usage(ctx context.Context, userID int64, resource Resource) (QuotaUsage, error)

	// IncrementUsage increments the usage counter for a user and resource.
	IncrementUsage(ctx context.Context, userID int64, resource Resource, amount int64, policy QuotaPolicy) error

	// ResetUsage resets the usage counter for a user and resource.
	ResetUsage(ctx context.Context, userID int64, resource Resource) error
}

// QuotaPolicy defines the quota configuration for a usage update.
type QuotaPolicy struct {
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
	// Limit is the total quota available for the resource.
	Limit int64

	// Remaining is the remaining quota for the resource.
	Remaining int64

	// ResetTime is the time when the quota resets.
	ResetTime time.Time

	// Window is the quota window in seconds.
	Window int64
}

// Reset returns the remaining time in seconds before the window resets.
func (q Quota) Reset() int64 {
	if q.ResetTime.IsZero() {
		if q.Window > 0 && q.Remaining == q.Limit {
			return q.Window
		}
		return 0
	}

	remaining := time.Until(q.ResetTime)
	if remaining <= 0 {
		return 0
	}
	return int64((remaining + time.Second - 1) / time.Second)
}

// Resource represents different types of resources that can be metered and tracked.
type Resource string

const (
	ResourceCopilotMessage       Resource = "copilotMessage"
	ResourceAIDescription        Resource = "aiDescription"
	ResourceAIInteractionTurn    Resource = "aiInteractionTurn"
	ResourceAIInteractionArchive Resource = "aiInteractionArchive"
)
