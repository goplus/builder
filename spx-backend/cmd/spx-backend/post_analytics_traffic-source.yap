// Create traffic source record for sharing.
//
// Request:
//   POST /analytics/traffic-source

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

params := &controller.CreateTrafficSourceParams{}
if !parseJSON(ctx, params) {
	return
}

if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

response, err := ctrl.CreateTrafficSource(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

json response