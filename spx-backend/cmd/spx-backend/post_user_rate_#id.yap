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

newRate := &controller.PostRateRequest{}
if !parseJSON(ctx, newRate) {
	return
}


rate, err := ctrl.InsertRate(ctx.Context(), ${id}, user.Id, newRate)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json rate
