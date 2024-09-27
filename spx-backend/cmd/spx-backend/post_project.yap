// Create a project.
//
// Request:
//   POST /project

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

if _, ok := ensureUser(ctx); !ok {
	return
}

params := &controller.CreateProjectParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

project, err := ctrl.CreateProject(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json 201, project
