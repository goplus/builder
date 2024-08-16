// Add an asset.
//
// Request:
//   POST /user/liked

import (
"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

user, ok := ensureUser(ctx)
if !ok {
return
}

params := &controller.AddUserAssetParams{}
owner := user.Name
if !parseJSON(ctx, params) {
return
}


err := ctrl.AddUserAsset(ctx.Context(), params,"liked",owner)
if err != nil {
replyWithInnerError(ctx, err)
return
}
json nil