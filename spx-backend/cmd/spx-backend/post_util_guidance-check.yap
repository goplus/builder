// Check the code.
//
// Request:
//   POST /util/guidance-check

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, isAuthed := ensureAuthedUser(ctx); !isAuthed {
	return
}

params := &controller.CheckCodeParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

result, err := ctrl.CheckCode(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json result
