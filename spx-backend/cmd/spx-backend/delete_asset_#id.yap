// Delete an asset.
//
// Request:
//   DELETE /asset/:id

ctx := &Context

if err := ctrl.DeleteAsset(ctx.Context(), ${id}); err != nil {
	replyWithInnerError(ctx, err)
	return
}
json nil
