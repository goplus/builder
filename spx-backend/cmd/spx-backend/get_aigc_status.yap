// Get generate status from ai.
//
// Request:
//   POST /aigc/status

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

_, ok := ensureUser(ctx)
if !ok {
	return
}
params := &controller.QueryParams{}
params.JobId = ${jobId}

result, err := ctrl.Query(ctx.Context(), params)

if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json result
