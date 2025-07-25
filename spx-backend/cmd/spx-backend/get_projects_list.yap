// List projects.
//
// Request:
//   GET /projects/list

import (
	"strconv"
	"time"

	"github.com/goplus/builder/spx-backend/internal/controller"
	"github.com/goplus/builder/spx-backend/internal/model"
)

ctx := &Context

params := controller.NewListProjectsParams()

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

if remixedFrom := ${remixedFrom}; remixedFrom != "" {
	rs, err := controller.ParseRemixSource(remixedFrom)
	if err != nil {
		replyWithCodeMsg(ctx, errorInvalidArgs, "invalid remixedFrom")
		return
	}
	params.RemixedFrom = &rs
}

if keyword := ${keyword}; keyword != "" {
	params.Keyword = &keyword
}

if visibility := ${visibility}; visibility != "" {
	v, err := model.ParseVisibility(visibility)
	if err != nil {
		replyWithCodeMsg(ctx, errorInvalidArgs, "invalid visibility")
		return
	}
	params.Visibility = &v
}

if liker := ${liker}; liker != "" {
	params.Liker = &liker
}

if createdAfter := ${createdAfter}; createdAfter != "" {
	createdAfterTime, err := time.Parse(time.RFC3339Nano, createdAfter)
	if err != nil {
		replyWithCodeMsg(ctx, errorInvalidArgs, "invalid createdAfter")
		return
	}
	params.CreatedAfter = &createdAfterTime
}

if likesReceivedAfter := ${likesReceivedAfter}; likesReceivedAfter != "" {
	likesReceivedAfterTime, err := time.Parse(time.RFC3339Nano, likesReceivedAfter)
	if err != nil {
		replyWithCodeMsg(ctx, errorInvalidArgs, "invalid likesReceivedAfter")
		return
	}
	params.LikesReceivedAfter = &likesReceivedAfterTime
}

if remixesReceivedAfter := ${remixesReceivedAfter}; remixesReceivedAfter != "" {
	remixesReceivedAfterTime, err := time.Parse(time.RFC3339Nano, remixesReceivedAfter)
	if err != nil {
		replyWithCodeMsg(ctx, errorInvalidArgs, "invalid remixesReceivedAfter")
		return
	}
	params.RemixesReceivedAfter = &remixesReceivedAfterTime
}

if fromFollowees := ${fromFollowees}; fromFollowees != "" {
	fromFolloweesBool, err := strconv.ParseBool(fromFollowees)
	if err != nil {
		replyWithCodeMsg(ctx, errorInvalidArgs, "invalid fromFollowees")
		return
	}
	params.FromFollowees = &fromFolloweesBool
}

if orderBy := ${orderBy}; orderBy != "" {
	params.OrderBy = controller.ListProjectsOrderBy(orderBy)
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

projects, err := ctrl.ListProjects(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json projects
