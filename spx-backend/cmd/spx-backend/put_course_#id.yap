// Update a course.
//
// Request:
//   PUT /course/:id

import (
	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

if !authz.CanManageCourses(ctx.Context()) {
	replyWithCodeMsg(ctx, errorForbidden, "You are not allowed to update courses")
	return
}

params := &controller.UpdateCourseParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

course, err := ctrl.UpdateCourse(ctx.Context(), ${id}, params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json course
