// Create or update project context keywords using LLM.
// This endpoint will create new context or update existing context for a project.
// Use force_regenerate=true to force regeneration even if context exists.
//
// Request:
//   POST /projects/context/generate

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

params := &controller.ProjectContextParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

result, err := ctrl.GenerateProjectContext(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

json result