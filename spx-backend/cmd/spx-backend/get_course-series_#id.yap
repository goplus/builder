// Get course series by id.
//
// Request:
//   GET /course-series/:id

ctx := &Context

courseSeries, err := ctrl.GetCourseSeries(ctx.Context(), ${id})
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json courseSeries
