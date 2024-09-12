// Extract motion from video
//
// Request:
//   POST /aigc/motion

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

_, ok := ensureUser(ctx)
if !ok {
	return
}

params := &controller.ExtractMotionParams{}
if !parseJSON(ctx, params) {
	return
}
result, err := ctrl.ExtractMotion(ctx.Context(),params)

if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json result
