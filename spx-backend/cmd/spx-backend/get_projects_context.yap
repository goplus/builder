// Get existing project context keywords (fast query for search).
// Returns cached project context without LLM generation.
//
// Request:
//   GET /projects/context?project_id=123

import (
	"strconv"
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

projectIDStr := ctx.FormValue("project_id")
if projectIDStr == "" {
	replyWithCodeMsg(ctx, errorInvalidArgs, "project_id is required")
	return
}

projectID, err := strconv.ParseInt(projectIDStr, 10, 64)
if err != nil || projectID <= 0 {
	replyWithCodeMsg(ctx, errorInvalidArgs, "project_id must be a positive integer")
	return
}

result, err := ctrl.GetProjectContext(ctx.Context(), projectID)
if err != nil {
	replyWithCodeMsg(ctx, errorNotFound, "project context not found")
	return
}

json result