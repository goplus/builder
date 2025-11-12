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
func (*nopQuotaTracker) Usage(context.Context, int64, authz.QuotaPolicy) (authz.QuotaUsage, error) {
	return authz.QuotaUsage{}, nil
}

// IncrementUsage implements [authz.QuotaTracker].
func (*nopQuotaTracker) IncrementUsage(context.Context, int64, authz.QuotaPolicy, int64) error {
	return nil
}

// ResetUsage implements [authz.QuotaTracker].
func (*nopQuotaTracker) ResetUsage(context.Context, int64, authz.QuotaPolicy) error {
	return nil
}
