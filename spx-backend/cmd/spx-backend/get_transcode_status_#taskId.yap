// Get transcode status by task ID.
//
// Request:
//   GET /transcode/status/:taskId

ctx := &Context

result, err := ctrl.GetTranscodeStatus(ctx.Context(), ${taskId})
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json result