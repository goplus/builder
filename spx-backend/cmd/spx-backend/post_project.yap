// Add a project.
//
// Request:
//   POST /project

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

user, ok := ensureUser(ctx)
if !ok {
	return
}

params := &controller.AddProjectParams{}
if !parseJSON(ctx, params) {
	return
}
params.Owner = user.Name
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

project, err := ctrl.AddProject(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json project
