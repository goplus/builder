// Delete an asset.
//
// Request:
//   DELETE /asset/:id

ctx := &Context
if _, isAuthed := ensureAuthedUser(ctx); !isAuthed {
	return
}

if err := ctrl.DeleteAsset(ctx.Context(), ${id}); err != nil {
	replyWithInnerError(ctx, err)
	return
}
text 204, "", ""
