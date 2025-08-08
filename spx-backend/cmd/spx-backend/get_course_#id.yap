// Get course by id.
//
// Request:
//   GET /course/:id

ctx := &Context

course, err := ctrl.GetCourse(ctx.Context(), ${id})
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json course
