// Submit user feedback for image recommendations.
//
// Request:
//   POST /images/feedback

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

params := &controller.ImageFeedbackParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

err := ctrl.SubmitImageFeedback(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

json map[string]interface{}{
	"status": "success",
	"message": "Feedback submitted successfully",
}
