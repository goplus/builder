// List assets.
//
// Request:
//   GET /asset/history/list

import (
	"strconv"

	"github.com/goplus/builder/spx-backend/internal/controller"
	"github.com/goplus/builder/spx-backend/internal/model"
)

ctx := &Context

user, _ := controller.UserFromContext(ctx.Context())
params := &controller.ListUserAssetsParams{}

switch owner := ${owner}; owner {
case "":
	if user == nil {
		replyWithCode(ctx, errorUnauthorized)
		return
	}
	params.Owner = &user.Name
default:
	params.Owner = &owner
}


if orderBy := ${orderBy}; orderBy != "" {
	params.OrderBy = controller.ListAssetsOrderBy(orderBy)
}

params.Pagination.Index = ctx.ParamInt("pageIndex", firstPageIndex)
params.Pagination.Size = ctx.ParamInt("pageSize", defaultPageSize)

assets, err := ctrl.ListUserAssets(ctx.Context(),"history", params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json assets
