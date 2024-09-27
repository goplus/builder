// Create a project release.
//
// Request:
//   POST /project-release

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

if _, ok := ensureUser(ctx); !ok {
	return
}

params := &controller.CreateProjectReleaseParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

projectRelease, err := ctrl.CreateProjectRelease(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json 201, projectRelease
