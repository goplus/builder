// Get project by owner and name.
//
// Request:
//   GET /user/rate/:id

ctx := &Context

project, err := ctrl.GetProject(ctx.Context(), ${owner}, ${name})
if err != nil {
replyWithInnerError(ctx, err)
return
}
json project
