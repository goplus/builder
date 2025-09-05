// Delete recording by ID.
//
// Request:
//   DELETE /recording/:id

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
    return
}

if err := ctrl.DeleteRecording(ctx.Context(), ${id}); err != nil {
    replyWithInnerError(ctx, err)
    return
}
text 204, "", ""