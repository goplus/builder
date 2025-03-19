// Get project by owner and name.
//
// Request:
//   GET /project/:owner/:name

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

projectFullName := controller.ProjectFullName{Owner: ${owner}, Project: ${name}}
project, err := ctrl.GetProject(ctx.Context(), projectFullName)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json project
