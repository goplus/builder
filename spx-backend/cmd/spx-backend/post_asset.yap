// Add an asset.
//
// Request:
//   POST /asset

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

user, ok := ensureUser(ctx)
if !ok {
	return
}

params := &controller.AddAssetParams{}
if !parseJSON(ctx, params) {
	return
}
params.Owner = user.Name
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

asset, err := ctrl.AddAsset(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json asset
