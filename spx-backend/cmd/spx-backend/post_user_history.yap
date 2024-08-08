// Add an asset.
//
// Request:
//   POST /user/history

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

user, ok := ensureUser(ctx)
if !ok {
	return
}

params := &controller.AddUserAssetParams{}
if !parseJSON(ctx, params) {
	return
}
params.Owner = user.Name

err := ctrl.AddUserAsset(ctx.Context(), params,"history")
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
