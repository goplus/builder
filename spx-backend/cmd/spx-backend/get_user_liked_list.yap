// List assets.
//
// Request:
//   GET /asset/liked/list

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

if assetTypeParam := ${assetType}; assetTypeParam != "" {
	assetTypeInt, err := strconv.Atoi(assetTypeParam)
if err != nil {
	replyWithCode(ctx, errorInvalidArgs)
	return
}
	assetType := model.AssetType(assetTypeInt)
	params.AssetType = &assetType
}

if orderBy := ${orderBy}; orderBy != "" {
	params.OrderBy = controller.ListAssetsOrderBy(orderBy)
}

params.Pagination.Index = ctx.ParamInt("pageIndex", firstPageIndex)
params.Pagination.Size = ctx.ParamInt("pageSize", defaultPageSize)

assets, err := ctrl.ListUserAssets(ctx.Context(),"liked", params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json assets
