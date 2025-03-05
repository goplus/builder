// Get the relationship between the user and the story line
//
// Request:
//   GET /storyline/:id/study

ctx := &Context
if _, isAuthed := ensureAuthedUser(ctx); !isAuthed {
	return
}

userStorylineRelationship, err := ctrl.getStoryLineStudy(ctx.Context(), ${id})
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json userStorylineRelationship
