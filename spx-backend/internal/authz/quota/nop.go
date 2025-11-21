package quota

import (
	"context"

	"github.com/goplus/builder/spx-backend/internal/authz"
)

// nopQuotaTracker implements [authz.QuotaTracker] with no-op functionality.
type nopQuotaTracker struct{}

// NewNopQuotaTracker creates a new no-op quota tracker.
func NewNopQuotaTracker() authz.QuotaTracker {
	return &nopQuotaTracker{}
}

// TryConsume implements [authz.QuotaTracker].
func (*nopQuotaTracker) TryConsume(context.Context, int64, []authz.QuotaPolicy, int64) (*authz.Quota, error) {
	return nil, nil
}

// Usage implements [authz.QuotaTracker].
func (*nopQuotaTracker) Usage(ctx context.Context, userID int64, policies []authz.QuotaPolicy) ([]authz.QuotaUsage, error) {
	return make([]authz.QuotaUsage, len(policies)), nil
}

// ResetUsage implements [authz.QuotaTracker].
func (*nopQuotaTracker) ResetUsage(context.Context, int64, []authz.QuotaPolicy) error {
	return nil
}
