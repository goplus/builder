// List assets.
//
// Request:
//   GET /assets/list

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
	"github.com/goplus/builder/spx-backend/internal/model"
)

ctx := &Context

params := controller.NewListAssetsParams()

if keyword := ${keyword}; keyword != "" {
	params.Keyword = &keyword
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

if typeParam := ctx.Param("type"); typeParam != "" {
	at, err := model.ParseAssetType(typeParam)
	if err != nil {
		replyWithCodeMsg(ctx, errorInvalidArgs, "invalid type")
		return
	}
	params.Type = &at
}

if category := ${category}; category != "" {
	params.Category = &category
}

if filesHash := ${filesHash}; filesHash != "" {
	params.FilesHash = &filesHash
}

if visibility := ${visibility}; visibility != "" {
	v, err := model.ParseVisibility(visibility)
	if err != nil {
		replyWithCodeMsg(ctx, errorInvalidArgs, "invalid visibility")
		return
	}
	params.Visibility = &v
}

if orderBy := ${orderBy}; orderBy != "" {
	params.OrderBy = controller.ListAssetsOrderBy(orderBy)
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

assets, err := ctrl.ListAssets(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json assets
