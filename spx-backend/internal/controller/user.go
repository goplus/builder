package controller

import (
	"context"
	"fmt"

	"github.com/casdoor/casdoor-go-sdk/casdoorsdk"
)

// User is the user info.
type User casdoorsdk.User

// userContextKey is the context key for user.
var userContextKey = &contextKey{"user"}

// NewContextWithUser creates a new context with user.
func NewContextWithUser(ctx context.Context, user *User) context.Context {
	return context.WithValue(ctx, userContextKey, user)
}

// UserFromContext gets user from context.
func UserFromContext(ctx context.Context) (user *User, ok bool) {
	user, ok = ctx.Value(userContextKey).(*User)
	return
}

// EnsureUser ensures there is a user in the context and it matches the expected user.
func EnsureUser(ctx context.Context, expectedUser string) (*User, error) {
	user, ok := UserFromContext(ctx)
	if !ok {
		return nil, ErrUnauthorized
	}
	if user.Name != expectedUser {
		return nil, ErrForbidden
	}
	return user, nil
}

// UserFromToken gets user from the provided JWT token.
func (ctrl *Controller) UserFromToken(token string) (*User, error) {
	claims, err := ctrl.casdoorClient.ParseJwtToken(token)
	if err != nil {
		return nil, fmt.Errorf("ctrl.casdoorClient.ParseJwtToken failed: %w", err)
	}
	user := User(claims.User)
	return &user, nil
}
