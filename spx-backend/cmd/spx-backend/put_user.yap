// Update the authenticated user.
//
// Request:
//   PUT /user

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, isAuthed := ensureAuthedUser(ctx); !isAuthed {
	return
}

params := &controller.UpdateAuthedUserParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

user, err := ctrl.UpdateAuthedUser(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json user
