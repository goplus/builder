// List recordings.
//
// Request:
//   GET /recordings/list

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

params := controller.NewListRecordingsParams()

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

if projectFullName := ${projectFullName}; projectFullName != "" {
	pfn, err := controller.ParseProjectFullName(projectFullName)
	if err != nil {
		replyWithCodeMsg(ctx, errorInvalidArgs, "invalid projectFullName")
		return
	}
	params.ProjectFullName = &pfn
}

if keyword := ${keyword}; keyword != "" {
	params.Keyword = &keyword
}

if liker := ${liker}; liker != "" {
	params.Liker = &liker
}

if orderBy := ${orderBy}; orderBy != "" {
	params.OrderBy = controller.ListRecordingsOrderBy(orderBy)
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

recordings, err := ctrl.ListRecordings(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json recordings