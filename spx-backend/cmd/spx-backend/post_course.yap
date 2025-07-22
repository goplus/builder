// Create a course.
//
// Request:
//   POST /course

import (
	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

if !authz.CanManageCourses(ctx.Context()) {
	replyWithCodeMsg(ctx, errorForbidden, "You are not allowed to create courses")
	return
}

params := &controller.CreateCourseParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

course, err := ctrl.CreateCourse(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json 201, course
