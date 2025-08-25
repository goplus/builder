// Delete record by ID.
//
// Request:
//   DELETE /record/:id

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
    return
}

if err := ctrl.DeleteRecord(ctx.Context(), ${id}); err != nil {
    replyWithInnerError(ctx, err)
    return
}
text 204, "", ""