//Inpainting image with control image.
//
// Request:
//   POST /aigc/inpainting

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

_, ok := ensureUser(ctx)
if !ok {
	return
}

params := &controller.GenerateInpaintingParams{}
if !parseJSON(ctx, params) {
	return
}
result, err := ctrl.GenerateInpainting(ctx.Context(),params)

if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json result
