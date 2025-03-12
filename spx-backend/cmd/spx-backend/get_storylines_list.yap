// List storyline.
//
// Request:
//   GET /storylines/list

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

params := controller.NewListStorylineParams()

if tag := ${tag}; tag != "" {
  params.Tag = &tag
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

storylines, err := ctrl.ListStoryline(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json storylines