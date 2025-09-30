// Handle Qiniu transcode callback.
//
// Request:
//   POST /transcode/callback

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

params := &controller.QiniuPfopCallbackParams{}
if !parseJSON(ctx, params) {
	return
}

err := ctrl.HandleTranscodeCallback(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

// 返回200表示成功接收回调
text 200, "", ""