// Get asset by id.
//
// Request:
//   GET /asset/list/suggestions

ctx := &Context


assetsName, err := ctrl.GetSearchSuggestions(ctx.Context(), ${query}, ${limit})
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json assetsName
