// Create an asset.
//
// Request:
//   POST /asset

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

if _, ok := ensureUser(ctx); !ok {
	return
}

params := &controller.CreateAssetParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

asset, err := ctrl.CreateAsset(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json 201, asset
