// Get asset by id.
//
// Request:
//   GET /asset/:id

ctx := &Context

asset, err := ctrl.GetAsset(ctx.Context(), ${id})
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json asset
