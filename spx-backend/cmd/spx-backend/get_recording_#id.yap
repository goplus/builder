// Get record by ID.
//
// Request:
//   GET /record/:id

ctx := &Context

record, err := ctrl.GetRecord(ctx.Context(), ${id})
if err != nil {
    replyWithInnerError(ctx, err)
    return
}
json record