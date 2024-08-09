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

if ${id} == "" {
	params := &controller.AIStartChatParams{}
	if !parseJSON(ctx, params) {
		return
	}
	resp, err := ctrl.StartChat(ctx, params)
	if err != nil {
		return
	}
	json resp
} else {
	params := &contriller.AIChatParams{}
	if !parseJSON(ctx, params) {
		return
	}
	resp, err := ctrl.NextChatEx(ctx, ${id}, params.UserInput)
	if err != nil {
		return
	}
	json resp
}


