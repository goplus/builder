// Update an storyline.
//
// Request:
//   PUT /storyline/:id

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, isAuthed := ensureAuthedUser(ctx); !isAuthed {
	return
}

params := &controller.UpdateStorylineParams{}
if !parseJSON(ctx, params) {
	return
}

storyline, err := ctrl.UpdateStoryline(ctx.Context(), ${id}, params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json storyline
