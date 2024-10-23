// Record a project view.
//
// Request:
//   POST /project/:owner/:name/view

ctx := &Context
if _, isAuthed := ensureAuthedUser(ctx); !isAuthed {
	return
}

if err := ctrl.RecordProjectView(ctx.Context(), ${owner}, ${name}); err != nil {
	replyWithInnerError(ctx, err)
	return
}
text 204, "", ""
