package authn

import (
	"context"

	"github.com/goplus/builder/spx-backend/internal/model"
)

// Authenticator defines the interface for user authentication.
type Authenticator interface {
	// Authenticate attempts to authenticate a user from token. It returns
	// nil user and nil error for invalid tokens (soft fail).
	Authenticate(ctx context.Context, token string) (*model.User, error)
}
