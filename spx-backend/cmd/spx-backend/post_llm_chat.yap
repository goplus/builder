// Start ai chat.
//
// Request:
//   POST /llm/chat

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

user, ok := ensureUser(ctx)
if !ok {
	return
}

params := &controller.AIStartChatParams{}
if !parseJSON(ctx, params) {
	return
}
resp, err := ctrl.StartChat(ctx, params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json resp
