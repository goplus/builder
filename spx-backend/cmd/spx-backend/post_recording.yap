// Create a recording.
//
// Request:
//   POST /recording

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

params := &controller.CreateRecordingParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

recording, err := ctrl.CreateRecording(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json 201, recording