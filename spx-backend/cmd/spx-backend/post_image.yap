// Generate image and return metadata.
//
// Request:
//   POST /image

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

params := &controller.GenerateImageParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

result, err := ctrl.GenerateImage(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

json result
