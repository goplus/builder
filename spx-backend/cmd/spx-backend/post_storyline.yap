// Create a storyline.
//
// Request:
//   POST /storyline

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, isAuthed := ensureAuthedUser(ctx); !isAuthed {
	return
}

params := &controller.CreateStorylineParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

storyline, err := ctrl.CreateStoryline(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json 201, storyline