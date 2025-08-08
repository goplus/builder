// Delete a course.
//
// Request:
//   DELETE /course/:id

import (
	"github.com/goplus/builder/spx-backend/internal/authz"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

if !authz.CanManageCourses(ctx.Context()) {
	replyWithCodeMsg(ctx, errorForbidden, "You are not allowed to delete courses")
	return
}

err := ctrl.DeleteCourse(ctx.Context(), ${id})
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
text 204, "", ""
