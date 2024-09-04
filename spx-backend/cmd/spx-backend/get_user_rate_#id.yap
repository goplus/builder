// Get asset rate.
//
// Request:
//   GET /user/rate/:id

ctx := &Context

rate, err := ctrl.GetRate(ctx.Context(), ${id})
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json rate
