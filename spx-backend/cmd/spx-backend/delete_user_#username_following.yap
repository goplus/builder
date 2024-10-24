// Unfollow a user.
//
// Request:
//   DELETE /user/:username/following

ctx := &Context
if _, isAuthed := ensureAuthedUser(ctx); !isAuthed {
	return
}

if err := ctrl.UnfollowUser(ctx.Context(), ${username}); err != nil {
	replyWithInnerError(ctx, err)
	return
}
text 204, "", ""
