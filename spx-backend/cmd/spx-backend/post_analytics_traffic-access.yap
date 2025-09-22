// Record traffic access for existing traffic source.
//
// Request:
//   POST /analytics/traffic-access

ctx := &Context

var trafficSourceID string
if !parseJSON(ctx, &trafficSourceID) {
	return
}

if trafficSourceID == "" {
	replyWithCodeMsg(ctx, errorInvalidArgs, "trafficSourceId is required")
	return
}

err := ctrl.RecordTrafficAccess(ctx.Context(), trafficSourceID)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

text 204, "", ""