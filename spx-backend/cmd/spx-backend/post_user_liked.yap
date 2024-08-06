// Add an asset.
//
// Request:
//   POST /user/liked

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

_, ok := ensureUser(ctx)
if !ok {
	return
}

params := &controller.AddUserAssetParams{}
if !parseJSON(ctx, params) {
	return
}

err := ctrl.AddUserAsset(ctx.Context(), params,"liked")
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
