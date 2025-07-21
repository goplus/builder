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

// Usage implements [authz.QuotaTracker].
func (*nopQuotaTracker) Usage(context.Context, int64, authz.Resource) (int64, error) {
	return 0, nil
}

// IncrementUsage implements [authz.QuotaTracker].
func (*nopQuotaTracker) IncrementUsage(context.Context, int64, authz.Resource, int64) error {
	return nil
}

// ResetUsage implements [authz.QuotaTracker].
func (*nopQuotaTracker) ResetUsage(context.Context, int64, authz.Resource) error {
	return nil
}
