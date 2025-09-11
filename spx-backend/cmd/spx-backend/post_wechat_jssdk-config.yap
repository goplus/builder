// Get WeChat JS-SDK configuration.
//
// Request:
//   POST /wechat/jssdk-config

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

params := &controller.WeChatJSSDKConfigParams{}
if !parseJSON(ctx, params) {
	return
}

if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

result, err := ctrl.GetWeChatJSSDKConfig(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

json result