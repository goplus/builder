// Check if a user is followed by the authenticated user.
//
// Request:
//   GET /user/:username/following

ctx := &Context
if _, isAuthed := ensureAuthedUser(ctx); !isAuthed {
	return
}

isFollowing, err := ctrl.IsFollowingUser(ctx.Context(), ${username})
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
if isFollowing {
	ctx.text 204, "", ""
} else {
	replyWithCode(ctx, errorNotFound)
}
