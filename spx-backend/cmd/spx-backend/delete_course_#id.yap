// Delete a course.
//
// Request:
//   DELETE /course/:id

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

err := ctrl.DeleteCourse(ctx.Context(), ${id})
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
text 204, "", ""
