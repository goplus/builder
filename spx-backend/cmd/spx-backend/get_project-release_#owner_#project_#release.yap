// Get project release by its full name.
//
// Request:
//   GET /project-release/:owner/:project/:release

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

projectFullName := controller.ProjectFullName{Owner: ${owner}, Project: ${name}}
projectReleaseFullName := controller.ProjectReleaseFullName{ProjectFullName: projectFullName, Release: ${release}}
projectRelease, err := ctrl.GetProjectRelease(ctx.Context(), projectReleaseFullName)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json projectRelease
