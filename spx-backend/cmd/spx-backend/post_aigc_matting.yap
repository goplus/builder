// Remove background for given image.
//
// Request:
//   POST /aigc/matting

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

params := &controller.MattingParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

result, err := ctrl.Matting(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json result
