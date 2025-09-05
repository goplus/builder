// Get recording by ID.
//
// Request:
//   GET /recording/:id

ctx := &Context

recording, err := ctrl.GetRecording(ctx.Context(), ${id})
if err != nil {
    replyWithInnerError(ctx, err)
    return
}
json recording