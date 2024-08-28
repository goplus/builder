// Start ai chat.
//
// Request:
//   POST /llm/chat/:id

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

_, ok := ensureUser(ctx)
if !ok {
	return
}

params := &controller.AIChatParams{}
if !parseJSON(ctx, params) {
	return
}

resp, err := ctrl.NextChat(ctx.Context(), ${id}, params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json resp
