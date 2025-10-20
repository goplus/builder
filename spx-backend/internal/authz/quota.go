package authz

import "context"

// QuotaTracker defines the interface for tracking resource usage quotas.
type QuotaTracker interface {
	// Usage returns the current usage for a user and resource.
	Usage(ctx context.Context, userID int64, resource Resource) (int64, error)

	// IncrementUsage increments the usage counter for a user and resource.
	IncrementUsage(ctx context.Context, userID int64, resource Resource, amount int64) error

	// ResetUsage resets the usage counter for a user and resource.
	ResetUsage(ctx context.Context, userID int64, resource Resource) error
}

// Resource represents different types of resources that can be metered and tracked.
type Resource string

const (
	ResourceCopilotMessage       Resource = "copilotMessage"
	ResourceAIDescription        Resource = "aiDescription"
	ResourceAIInteractionTurn    Resource = "aiInteractionTurn"
	ResourceAIInteractionArchive Resource = "aiInteractionArchive"
)
