// List records.
//
// Request:
//   GET /records/list

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

params := controller.NewListRecordsParams()

// Handle owner parameter
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

// Handle projectFullName filter
if projectFullName := ${projectFullName}; projectFullName != "" {
	pfn, err := controller.ParseProjectFullName(projectFullName)
	if err != nil {
		replyWithCodeMsg(ctx, errorInvalidArgs, "invalid projectFullName")
		return
	}
	params.ProjectFullName = &pfn
}

// Handle keyword filter
if keyword := ${keyword}; keyword != "" {
	params.Keyword = &keyword
}

// Handle liker filter
if liker := ${liker}; liker != "" {
	params.Liker = &liker
}

// Handle orderBy parameter
if orderBy := ${orderBy}; orderBy != "" {
	params.OrderBy = controller.ListRecordsOrderBy(orderBy)
}

// Handle sortOrder parameter
if sortOrder := ${sortOrder}; sortOrder != "" {
	params.SortOrder = controller.SortOrder(sortOrder)
}

// Handle pagination
params.Pagination.Index = paramInt("pageIndex", firstPageIndex)
params.Pagination.Size = paramInt("pageSize", defaultPageSize)

// Validate parameters
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

// Call controller method
records, err := ctrl.ListRecords(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

// Return JSON response
json records