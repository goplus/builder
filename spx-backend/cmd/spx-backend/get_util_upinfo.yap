// Get the information for uploading files.
//
// Request:
//   GET /util/upinfo

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

upInfo, err := ctrl.GetUpInfo(ctx.Context())
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json upInfo
