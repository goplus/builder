// Update a course series.
//
// Request:
//   PUT /course-series/:id

import (
	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

if !authz.CanManageCourses(ctx.Context()) {
	replyWithCodeMsg(ctx, errorForbidden, "You are not allowed to update course series")
	return
}

params := &controller.UpdateCourseSeriesParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

courseSeries, err := ctrl.UpdateCourseSeries(ctx.Context(), ${id}, params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json courseSeries
