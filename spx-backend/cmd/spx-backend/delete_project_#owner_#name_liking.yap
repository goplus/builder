// Unlike a project.
//
// Request:
//   DELETE /project/:owner/:name/liking

ctx := &Context

if _, ok := ensureUser(ctx); !ok {
	return
}

if err := ctrl.UnlikeProject(ctx.Context(), ${owner}, ${name}); err != nil {
	replyWithInnerError(ctx, err)
	return
}
text 204, "", ""
