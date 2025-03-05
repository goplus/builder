// Study a storyline.
//
// Request:
//   POST /storyline/:id/study

ctx := &Context
if _, isAuthed := ensureAuthedUser(ctx); !isAuthed {
	return
}

userStorylineRelationship, err := ctrl.StudyStoryline(ctx.Context(), ${id})
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json userStorylineRelationship
