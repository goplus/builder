// Add an asset.
//
// Request:
//   POST /user/rate/:id

import (
"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

user, ok := ensureUser(ctx)
if !ok {
return
}

var rate int
owner := user.Name
if !parseJSON(ctx, rate) {
return
}


err := ctrl.AddUserAsset(ctx.Context(), ${id},user.Name,rate)
if err != nil {
replyWithInnerError(ctx, err)
return
}
json nil