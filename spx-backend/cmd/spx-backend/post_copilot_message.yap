// Generate a message by sending a list of input messages.
//
// Request:
//   POST /copilot/message

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

params := &controller.GenerateMessageParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

result, err := ctrl.GenerateMessage(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json result
