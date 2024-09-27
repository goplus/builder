// Check if a project is liked by the authenticated user.
//
// Request:
//   GET /project/:owner/:name/liking

ctx := &Context

if _, ok := ensureUser(ctx); !ok {
	return
}

hasLiked, err := ctrl.HasLikedProject(ctx.Context(), ${owner}, ${name})
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
if hasLiked {
	ctx.text 204, "", ""
} else {
	replyWithCode(ctx, errorNotFound)
}
