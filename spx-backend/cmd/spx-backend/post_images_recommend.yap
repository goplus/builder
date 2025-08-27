// Recommend similar images based on text prompt.
//
// Request:
//   POST /images/recommend

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

params := &controller.ImageRecommendParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

result, err := ctrl.RecommendImages(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

json result
