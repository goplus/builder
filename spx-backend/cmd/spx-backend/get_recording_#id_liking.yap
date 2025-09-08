// Check if current user likes the recording.
//
// Request:
//   GET /recording/:id/liking

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
    return
}

isLiking, err := ctrl.HasLikedRecording(ctx.Context(), ${id})
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

if isLiking {
	ctx.text 204, "", ""
	return
} else {
	replyWithCode(ctx, errorNotFound)
}