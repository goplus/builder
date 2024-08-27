// Start ai chat.
//
// Request:
//   POST /llm/chat

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

_, ok := ensureUser(ctx)
if !ok {
	return
}

params := &controller.AIStartChatParams{}
if !parseJSON(ctx, params) {
	return
}
resp, err := ctrl.StartChat(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json resp
