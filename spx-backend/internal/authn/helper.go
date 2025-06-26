package authn

import (
	"context"
	"errors"

	"github.com/goplus/builder/spx-backend/internal/model"
)

var (
	// ErrUnauthorized indicates the request is unauthorized.
	ErrUnauthorized = errors.New("unauthorized")

	// ErrForbidden indicates the request is forbidden.
	ErrForbidden = errors.New("forbidden")
)

// EnsureUser ensures there is an authenticated user in the context and it
// matches the expected user.
func EnsureUser(ctx context.Context, expectedUserID int64) (*model.User, error) {
	mUser, ok := UserFromContext(ctx)
	if !ok {
		return nil, ErrUnauthorized
	}
	if mUser.ID != expectedUserID {
		return nil, ErrForbidden
	}
	return mUser, nil
}
