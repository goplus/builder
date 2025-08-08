// Create a course series.
//
// Request:
//   POST /course-series

import (
	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

if !authz.CanManageCourses(ctx.Context()) {
	replyWithCodeMsg(ctx, errorForbidden, "You are not allowed to create course series")
	return
}

params := &controller.CreateCourseSeriesParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

courseSeries, err := ctrl.CreateCourseSeries(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json 201, courseSeries
