// List project releases.
//
// Request:
//   GET /project-releases/list

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

params := controller.NewListProjectReleasesParams()

if projectFullName := ${projectFullName}; projectFullName != "" {
	pfn, err := controller.ParseProjectFullName(projectFullName)
	if err != nil {
		replyWithCodeMsg(ctx, errorInvalidArgs, "invalid projectFullName")
		return
	}
	params.ProjectFullName = &pfn
}

if orderBy := ${orderBy}; orderBy != "" {
	params.OrderBy = controller.ListProjectReleasesOrderBy(orderBy)
}
if sortOrder := ${sortOrder}; sortOrder != "" {
	params.SortOrder = controller.SortOrder(sortOrder)
}

params.Pagination.Index = ctx.ParamInt("pageIndex", firstPageIndex)
params.Pagination.Size = ctx.ParamInt("pageSize", defaultPageSize)
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

projectReleases, err := ctrl.ListProjectReleases(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json projectReleases
