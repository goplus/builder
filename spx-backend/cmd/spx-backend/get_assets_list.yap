// List assets.
//
// Request:
//   GET /assets/list

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

params := controller.NewListAssetsParams()

if keyword := ${keyword}; keyword != "" {
	params.Keyword = &keyword
}

switch owner := ${owner}; owner {
case "":
	mAuthedUser, isAuthed := ensureAuthedUser(ctx)
	if !isAuthed {
		return
	}
	params.Owner = &mAuthedUser.Username
case "*":
	params.Owner = nil
default:
	params.Owner = &owner
}

if typeParam := ctx.Param("type"); typeParam != "" {
	params.Type = &typeParam
}

if category := ${category}; category != "" {
	params.Category = &category
}

if filesHash := ${filesHash}; filesHash != "" {
	params.FilesHash = &filesHash
}

if visibility := ${visibility}; visibility != "" {
	params.Visibility = &visibility
}

if orderBy := ${orderBy}; orderBy != "" {
	params.OrderBy = controller.ListAssetsOrderBy(orderBy)
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
