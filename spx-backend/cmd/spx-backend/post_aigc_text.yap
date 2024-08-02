// Get text suggestion from AI.
//
// Request:
//   POST /aigc/text

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

_, ok := ensureUser(ctx)
if !ok {
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
