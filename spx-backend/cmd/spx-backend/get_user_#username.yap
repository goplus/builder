// Get user by username.
//
// Request:
//   GET /user/:username

ctx := &Context

user, err := ctrl.GetUser(ctx.Context(), ${username})
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json user
