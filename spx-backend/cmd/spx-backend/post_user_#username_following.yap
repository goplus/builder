// Follow a user.
//
// Request:
//   POST /user/:username/following

ctx := &Context
if _, isAuthed := ensureAuthedUser(ctx); !isAuthed {
	return
}

if err := ctrl.FollowUser(ctx.Context(), ${username}); err != nil {
	replyWithInnerError(ctx, err)
	return
}
text 204, "", ""
