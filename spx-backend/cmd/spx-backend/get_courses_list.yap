// List courses.
//
// Request:
//   GET /courses/list

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
	"github.com/goplus/builder/spx-backend/internal/model"
)

ctx := &Context

params := controller.NewListCoursesParams()

if courseSeriesID := ${courseSeriesId}; courseSeriesID != "" {
	params.CourseSeriesID = &courseSeriesID
}

switch owner := ${owner}; owner {
case "":
	mUser, ok := ensureAuthenticatedUser(ctx)
	if !ok {
		return
	}
	params.Owner = &mUser.Username
case "*":
	params.Owner = nil
default:
	params.Owner = &owner
}

if orderBy := ${orderBy}; orderBy != "" {
	params.OrderBy = controller.ListCoursesOrderBy(orderBy)
}
if sortOrder := ${sortOrder}; sortOrder != "" {
	params.SortOrder = controller.SortOrder(sortOrder)
}

params.Pagination.Index = paramInt("pageIndex", firstPageIndex)
params.Pagination.Size = paramInt("pageSize", defaultPageSize)
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

courses, err := ctrl.ListCourses(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json courses
