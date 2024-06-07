// Update a project.
//
// Request:
//   PUT /project/:owner/:name

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

if _, ok := ensureUser(ctx); !ok {
	return
}

params := &controller.UpdateProjectParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

project, err := ctrl.UpdateProject(ctx.Context(), ${owner}, ${name}, params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json project
