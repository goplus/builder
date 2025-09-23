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

println("YAP: About to send JSON response with", result.ResultsCount, "results")
println("YAP: Query ID:", result.QueryID)
json result
println("YAP: JSON response sent successfully for query:", result.QueryID)
