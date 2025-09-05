// Generate SVG image directly.
//
// Request:
//   POST /image/svg

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

params := &controller.GenerateSVGParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

// Optimize prompt with theme analysis before generation
if params.Theme != controller.ThemeNone {
	params.Prompt = controller.OptimizePromptWithAnalysis(ctx.Context(), params.Prompt, params.Theme, ctrl.GetCopilot())
	params.Theme = controller.ThemeNone // Reset theme to avoid double processing
}

result, err := ctrl.GenerateSVG(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

// Set response headers
for key, value := range result.Headers {
	ctx.ResponseWriter.Header().Set(key, value)
}

// Write SVG content directly
ctx.ResponseWriter.WriteHeader(200)
ctx.ResponseWriter.Write(result.Data)
