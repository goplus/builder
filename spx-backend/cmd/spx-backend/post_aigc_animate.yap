// Generate Animation from image and optional motion
//
// Request:
//   POST /aigc/animate

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

_, ok := ensureUser(ctx)
if !ok {
	return
}

params := &controller.GenerateAnimateParams{}
if !parseJSON(ctx, params) {
	return
}
result, err := ctrl.GenerateAnimate(ctx.Context(),params)

if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json result
