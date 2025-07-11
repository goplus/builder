package authn

import (
	"context"

	"github.com/goplus/builder/spx-backend/internal/model"
)

// userContextKey is the context key type for authenticated users.
type userContextKey struct{}

// NewContextWithUser creates a new context with the authenticated user.
func NewContextWithUser(ctx context.Context, mUser *model.User) context.Context {
	return context.WithValue(ctx, userContextKey{}, mUser)
}

// UserFromContext gets the authenticated user from context.
func UserFromContext(ctx context.Context) (mUser *model.User, ok bool) {
	mUser, ok = ctx.Value(userContextKey{}).(*model.User)
	return
}
