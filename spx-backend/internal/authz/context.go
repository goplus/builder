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

// userQuotasContextKey is the context key type for user quotas.
type userQuotasContextKey struct{}

// NewContextWithUserQuotas creates a new context with the user quotas.
func NewContextWithUserQuotas(ctx context.Context, quotas UserQuotas) context.Context {
	return context.WithValue(ctx, userQuotasContextKey{}, quotas)
}

// UserQuotasFromContext gets the user quotas from context.
func UserQuotasFromContext(ctx context.Context) (UserQuotas, bool) {
	quotas, ok := ctx.Value(userQuotasContextKey{}).(UserQuotas)
	return quotas, ok
}
