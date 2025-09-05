// Like the specified recording as the authenticated user.
//
// Request:
//   POST /recording/:id/liking

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

if err := ctrl.LikeRecording(ctx.Context(), ${id}); err != nil {
	replyWithInnerError(ctx, err)
	return
}
text 204, "", ""