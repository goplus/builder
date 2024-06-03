// Delete a project.
//
// Request:
//   DELETE /project/:owner/:name

ctx := &Context

if err := ctrl.DeleteProject(ctx.Context(), ${owner}, ${name}); err != nil {
	replyWithInnerError(ctx, err)
	return
}
json nil
