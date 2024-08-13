// Start a ai task.
//
// Request:
//   POST /llm/task

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

user, ok := ensureUser(ctx)
if !ok {
	return
}

params := &controller.AITaskParams{}
if !parseJSON(ctx, params) {
	return
}

resp, err := ctrl.StartTask(ctx, params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json resp
