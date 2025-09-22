// Create traffic source record for sharing.
//
// Request:
//   POST /analytics/traffic-source

ctx := &Context

var platform string
if !parseJSON(ctx, &platform) {
	return
}

if platform == "" {
	replyWithCodeMsg(ctx, errorInvalidArgs, "platform must be 1-50 characters")
	return
}

response, err := ctrl.CreateTrafficSource(ctx.Context(), platform)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

json 201, response