// Update the authenticated user.
//
// Request:
//   PUT /user

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

params := &controller.UpdateAuthenticatedUserParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

user, err := ctrl.UpdateAuthenticatedUser(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json user
