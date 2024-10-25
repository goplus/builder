// Get project release by its full name.
//
// Request:
//   GET /project-release/:owner/:project/:release

ctx := &Context

projectRelease, err := ctrl.GetProjectRelease(ctx.Context(), ${owner}, ${project}, ${release})
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json projectRelease
