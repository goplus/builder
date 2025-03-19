// Update a project.
//
// Request:
//   PUT /project/:owner/:name

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, isAuthed := ensureAuthedUser(ctx); !isAuthed {
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

projectFullName := controller.ProjectFullName{Owner: ${owner}, Project: ${name}}
project, err := ctrl.UpdateProject(ctx.Context(), projectFullName, params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json project
