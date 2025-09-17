// Get Douyin H5 share configuration.
//
// Request:
//   POST /douyin/h5-config

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

params := &controller.DouyinH5ConfigParams{}
if !parseJSON(ctx, params) {
	return
}

if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

result, err := ctrl.GetDouyinH5Config(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

json result