// Record a project view.
//
// Request:
//   POST /project/:owner/:name/view

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

projectFullName := controller.ProjectFullName{Owner: ${owner}, Project: ${name}}
if err := ctrl.RecordProjectView(ctx.Context(), projectFullName); err != nil {
	replyWithInnerError(ctx, err)
	return
}
text 204, "", ""
