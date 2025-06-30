package authz

import "context"

// userCapabilitiesContextKey is the context key type for user capabilities.
type userCapabilitiesContextKey struct{}

// NewContextWithUserCapabilities creates a new context with the user capabilities.
func NewContextWithUserCapabilities(ctx context.Context, caps UserCapabilities) context.Context {
	return context.WithValue(ctx, userCapabilitiesContextKey{}, caps)
}

// UserCapabilitiesFromContext gets the user capabilities from context.
func UserCapabilitiesFromContext(ctx context.Context) (UserCapabilities, bool) {
	caps, ok := ctx.Value(userCapabilitiesContextKey{}).(UserCapabilities)
	return caps, ok
}
