// Convert Scratch to xbp
//
// Request:
//   POST /scratch-convert

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

params := &controller.Sb2xbpParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

xbp, err := ctrl.Convert(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json 201, xbp
