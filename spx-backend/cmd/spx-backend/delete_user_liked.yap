// Delete a project.
//
// Request:
//   DELETE /user/liked

ctx := &Context

user, ok := ensureUser(ctx)
if !ok {
	return
}

if err := ctrl.DeleteUserAsset(ctx.Context(), ${assetId},"liked",user.Name); err != nil {
replyWithInnerError(ctx, err)
return
}
json nil
