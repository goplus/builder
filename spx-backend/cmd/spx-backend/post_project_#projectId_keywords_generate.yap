// Generate keywords for a project based on project name and description.
//
// Request:
//   POST /project/{projectId}/keywords/generate

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

projectId, ok := parsePathParam(ctx, "projectId", parseInt64)
if !ok {
	return
}

params := &controller.ProjectKeywordGenerationParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

result, err := ctrl.GenerateProjectKeywords(ctx.Context(), projectId, params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

json result
