// Like a project.
//
// Request:
//   POST /project/:owner/:name/liking

ctx := &Context
if _, isAuthed := ensureAuthedUser(ctx); !isAuthed {
	return
}

if err := ctrl.LikeProject(ctx.Context(), ${owner}, ${name}); err != nil {
	replyWithInnerError(ctx, err)
	return
}
text 204, "", ""
