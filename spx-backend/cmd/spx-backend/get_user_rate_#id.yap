// Get project by owner and name.
//
// Request:
//   GET /user/rate/:id

ctx := &Context

user, ok := ensureUser(ctx)
rate, err := ctrl.GetRate(ctx.Context(), ${id}, user.Name)
if err != nil {
replyWithInnerError(ctx, err)
return
}
json rate
