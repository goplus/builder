// Delete an storyline.
//
// Request:
//   DELETE /storyline/:id

ctx := &Context
if _, isAuthed := ensureAuthedUser(ctx); !isAuthed {
	return
}

if err := ctrl.DeleteStoryline(ctx.Context(), ${id}); err != nil {
	replyWithInnerError(ctx, err)
	return
}
text 204, "", ""
