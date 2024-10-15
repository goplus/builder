// Unfollow a user.
//
// Request:
//   DELETE /user/:username/following

ctx := &Context

if _, ok := ensureUser(ctx); !ok {
	return
}

if err := ctrl.UnfollowUser(ctx.Context(), ${username}); err != nil {
	replyWithInnerError(ctx, err)
	return
}
text 204, "", ""
