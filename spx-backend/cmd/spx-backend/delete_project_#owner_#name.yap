// Delete a project.
//
// Request:
//   DELETE /project/:owner/:name

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

projectFullName := controller.ProjectFullName{Owner: ${owner}, Project: ${name}}
if err := ctrl.DeleteProject(ctx.Context(), projectFullName); err != nil {
	replyWithInnerError(ctx, err)
	return
}
text 204, "", ""
