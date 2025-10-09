// Submit a transcode task.
//
// Request:
//   POST /transcode/submit

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

params := &controller.SubmitTranscodeParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

response, err := ctrl.SubmitTranscode(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

json 201, response