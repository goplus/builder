// List course series.
//
// Request:
//   GET /course-serieses/list

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
	"github.com/goplus/builder/spx-backend/internal/model"
)

ctx := &Context

params := controller.NewListCourseSeriesParams()

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
	params.OrderBy = controller.ListCourseSeriesOrderBy(orderBy)
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

courseSeries, err := ctrl.ListCourseSeries(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json courseSeries
