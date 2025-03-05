// Get storyline by id.
//
// Request:
//   GET /storyline/:id

ctx := &Context
if _, isAuthed := ensureAuthedUser(ctx); !isAuthed {
	return
}

storyline, err := ctrl.GetStoryline(ctx.Context(), ${id})
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json storyline
