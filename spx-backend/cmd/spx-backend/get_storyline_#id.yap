// Get storyline by id.
//
// Request:
//   GET /storyline/:id

ctx := &Context

storyline, err := ctrl.GetStoryline(ctx.Context(), ${id})
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json storyline
