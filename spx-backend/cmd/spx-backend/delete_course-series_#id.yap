// Delete a course series.
//
// Request:
//   DELETE /course-series/:id

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

err := ctrl.DeleteCourseSeries(ctx.Context(), ${id})
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
text 204, "", ""
