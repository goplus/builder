package authn

import (
	"context"

	"github.com/goplus/builder/spx-backend/internal/model"
)

type mockAuthenticator struct {
	authenticateFunc func(ctx context.Context, token string) (*model.User, error)
}

func (m *mockAuthenticator) Authenticate(ctx context.Context, token string) (*model.User, error) {
	if m.authenticateFunc != nil {
		return m.authenticateFunc(ctx, token)
	}
	return newTestUser(), nil
}
