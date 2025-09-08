// Instant image recommendation with project context.
//
// Request:
//   POST /images/instant-recommend

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

params := &controller.InstantRecommendParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

result, err := ctrl.RecommendImagesWithContext(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

json result
