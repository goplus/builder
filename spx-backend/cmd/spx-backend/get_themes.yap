// Get all available themes for image generation.
//
// Request:
//   GET /themes

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

result, err := ctrl.GetThemes(ctx.Context())
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

json result
