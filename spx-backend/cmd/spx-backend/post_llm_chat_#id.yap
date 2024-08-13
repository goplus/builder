// Start ai chat.
//
// Request:
//   POST /llm/chat/:id

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

user, ok := ensureUser(ctx)
if !ok {
	return
}

params := &contriller.AIChatParams{}
if !parseJSON(ctx, params) {
	return
}

resp, err := ctrl.NextChat(ctx, ${id}, params.UserInput)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json resp
