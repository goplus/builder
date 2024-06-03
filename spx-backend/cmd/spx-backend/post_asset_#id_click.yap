// Increase the click count of an asset.
//
// Request:
//   POST /asset/:id/click

ctx := &Context

if err := ctrl.IncreaseAssetClickCount(ctx.Context(), ${id}); err != nil {
	replyWithInnerError(ctx, err)
	return
}
json nil
