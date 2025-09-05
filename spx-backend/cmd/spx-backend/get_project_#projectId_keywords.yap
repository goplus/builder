// Get keywords for a specific project.
//
// Request:
//   GET /project/{projectId}/keywords

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

projectId, ok := parsePathParam(ctx, "projectId", parseInt64)
if !ok {
	return
}

result, err := ctrl.GetProjectKeywords(ctx.Context(), projectId)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

json result
