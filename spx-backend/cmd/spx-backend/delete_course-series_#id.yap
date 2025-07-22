// Delete a course series.
//
// Request:
//   DELETE /course-series/:id

import (
	"github.com/goplus/builder/spx-backend/internal/authz"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

if !authz.CanManageCourses(ctx.Context()) {
	replyWithCodeMsg(ctx, errorForbidden, "You are not allowed to delete course series")
	return
}

err := ctrl.DeleteCourseSeries(ctx.Context(), ${id})
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
text 204, "", ""
