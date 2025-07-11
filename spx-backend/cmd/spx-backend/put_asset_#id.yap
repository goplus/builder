// Update an asset.
//
// Request:
//   PUT /asset/:id

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

params := &controller.UpdateAssetParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

asset, err := ctrl.UpdateAsset(ctx.Context(), ${id}, params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json asset
