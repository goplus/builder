// Get generate image from ai.
//
// Request:
//   POST /aigc/image

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

_, ok := ensureUser(ctx)
if !ok {
	return
}

params := &controller.GenerateParams{}
result, err := ctrl.Generating(ctx.Context(), params)

if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json result