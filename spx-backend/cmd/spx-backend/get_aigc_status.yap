// Get AIGC status.
//
// Request:
//   GET /aigc/status

ctx := &Context

assetStatus, err := ctrl.GetAIAssetStatus(ctx.Context(), ${jobId})
if err != nil {
replyWithInnerError(ctx, err)
return
}
json assetStatus
