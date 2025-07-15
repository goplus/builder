// Get the authenticated user.
//
// Request:
//   GET /user

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

user, err := ctrl.GetAuthenticatedUser(ctx.Context())
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json user
