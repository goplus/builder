// Get generate image from ai.（sync）
//
// Request:
//   POST /aigc/image/sync

import (
"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

_, ok := ensureUser(ctx)
if !ok {
return
}

params := &controller.GenerateParams{}
if !parseJSON(ctx, params) {
return
}
result, err := ctrl.GeneratingSync(ctx.Context(), params)

if err != nil {
replyWithInnerError(ctx, err)
return
}
json result
