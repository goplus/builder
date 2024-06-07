// Get project by owner and name.
//
// Request:
//   GET /project/:owner/:name

ctx := &Context

project, err := ctrl.GetProject(ctx.Context(), ${owner}, ${name})
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json project
