// Delete ai chat.
//
// Request:
//   DELETE /llm/chat/:id

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
ctrl.DeleteChat(ctx.Context(), ${id})
json {}
