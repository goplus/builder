// List users.
//
// Request:
//   GET /users/list

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

params := controller.NewListUsersParams()

if follower := ${follower}; follower != "" {
	params.Follower = &follower
}

if followee := ${followee}; followee != "" {
	params.Followee = &followee
}

if orderBy := ${orderBy}; orderBy != "" {
	params.OrderBy = controller.ListUsersOrderBy(orderBy)
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

users, err := ctrl.ListUsers(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json users
