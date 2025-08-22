// Check if current user likes the record.
//
// Request:
//   GET /record/:id/liking

ctx := &Context

isLiking, err := ctrl.HasLikedRecord(ctx.Context(), ${id})
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