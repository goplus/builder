package ai

import (
	"context"
	"maps"
)

type extraHeadersContextKey struct{}

// WithExtraHeaders returns a derived context carrying an opaque copy of
// headers for the active Transport request.
func WithExtraHeaders(ctx context.Context, headers map[string]string) context.Context {
	if ctx == nil {
		ctx = context.Background()
	}
	return context.WithValue(ctx, extraHeadersContextKey{}, maps.Clone(headers))
}

// ExtraHeadersFromContext returns a copy of the opaque Transport headers in
// ctx. Mutating the returned map does not affect the context or other requests.
func ExtraHeadersFromContext(ctx context.Context) map[string]string {
	if ctx == nil {
		return nil
	}
	headers, _ := ctx.Value(extraHeadersContextKey{}).(map[string]string)
	return maps.Clone(headers)
}
