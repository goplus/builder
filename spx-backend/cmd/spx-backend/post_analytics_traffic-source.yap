// Record traffic source.
//
// Request:
//   POST /analytics/traffic-source

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

params := &controller.TrafficSourceParams{}
if !parseJSON(ctx, params) {
	return
}

if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

// Get client IP address
ipAddress := getClientIP(ctx.Request)

err := ctrl.RecordTrafficSource(ctx.Context(), params, ipAddress)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

text 201, "recorded"