// Generate a stream by sending a list of input messages.
//
// Request:
//   POST /copilot/stream/message

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, isAuthed := ensureAuthedUser(ctx); !isAuthed {
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

read, err := ctrl.GenerateMessageStream(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

defer read.Close()

buf := make([]byte, 4096)
stream read, buf
