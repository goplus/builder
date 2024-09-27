// Follow a user.
//
// Request:
//   POST /user/:username/following

ctx := &Context

if _, ok := ensureUser(ctx); !ok {
	return
}

if err := ctrl.FollowUser(ctx.Context(), ${username}); err != nil {
	replyWithInnerError(ctx, err)
	return
}
text 204, "", ""
