// List projects.
//
// Request:
//   GET /projects/list

import (
	"strconv"

	"github.com/goplus/builder/spx-backend/internal/controller"
	"github.com/goplus/builder/spx-backend/internal/model"
)

ctx := &Context

user, _ := controller.UserFromContext(ctx.Context())
params := &controller.ListProjectsParams{}

if isPublicParam := ${isPublic}; isPublicParam != "" {
	isPublicInt, err := strconv.Atoi(isPublicParam)
	if err != nil {
		replyWithCode(ctx, errorInvalidArgs)
		return
	}
	isPublic := model.IsPublic(isPublicInt)
	params.IsPublic = &isPublic
}

switch owner := ${owner}; owner {
case "":
	if user == nil {
		replyWithCode(ctx, errorUnauthorized)
		return
	}
	params.Owner = &user.Name
case "*":
	params.Owner = nil
default:
	params.Owner = &owner
}

params.Pagination.Index = paramInt("pageIndex", firstPageIndex)
params.Pagination.Size = paramInt("pageSize", defaultPageSize)
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

projects, err := ctrl.ListProjects(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json projects
