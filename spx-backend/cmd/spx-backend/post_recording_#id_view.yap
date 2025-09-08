// Recording a view for the recording.
//
// Request:
//   POST /recording/:id/view

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

if err := ctrl.RecordRecordingView(ctx.Context(), ${id}); err != nil {
	replyWithInnerError(ctx, err)
	return
}
text 204, "", ""