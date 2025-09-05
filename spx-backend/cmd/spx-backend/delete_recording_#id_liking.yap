// Unlike a recording by ID.
//
// Request:
//   DELETE /recording/:id/liking

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

if err := ctrl.UnlikeRecording(ctx.Context(), ${id}); err != nil {
	replyWithInnerError(ctx, err)
	return
}
text 204, "", ""