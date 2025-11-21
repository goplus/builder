package authz

import "context"

// authorizerContextKey is the context key type for authorizers.
type authorizerContextKey struct{}

// newContextWithAuthorizer creates a new context with the authorizer.
func newContextWithAuthorizer(ctx context.Context, authorizer *Authorizer) context.Context {
	return context.WithValue(ctx, authorizerContextKey{}, authorizer)
}

// authorizerFromContext gets the authorizer from context.
func authorizerFromContext(ctx context.Context) (*Authorizer, bool) {
	authorizer, ok := ctx.Value(authorizerContextKey{}).(*Authorizer)
	return authorizer, ok
}

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

// userQuotaPoliciesContextKey is the context key type for user quota policies.
type userQuotaPoliciesContextKey struct{}

// NewContextWithUserQuotaPolicies creates a new context with the user quota policies.
func NewContextWithUserQuotaPolicies(ctx context.Context, quotas UserQuotaPolicies) context.Context {
	return context.WithValue(ctx, userQuotaPoliciesContextKey{}, quotas)
}

// UserQuotaPoliciesFromContext gets the user quota policies from context.
func UserQuotaPoliciesFromContext(ctx context.Context) (UserQuotaPolicies, bool) {
	quotaPolicies, ok := ctx.Value(userQuotaPoliciesContextKey{}).(UserQuotaPolicies)
	return quotaPolicies, ok
}
