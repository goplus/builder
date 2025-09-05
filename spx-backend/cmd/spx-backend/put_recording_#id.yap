// Update recording by ID.
//
// Request:
//   PUT /recording/:id

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

params := &controller.UpdateRecordingParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

recording, err := ctrl.UpdateRecording(ctx.Context(), ${id}, params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json recording