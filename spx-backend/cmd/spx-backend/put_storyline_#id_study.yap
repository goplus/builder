// Update the latest levels of the story line
//
// Request:
//   PUT /storyline/:id/study

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
  "fmt"
)

ctx := &Context
if _, isAuthed := ensureAuthedUser(ctx); !isAuthed {
	return
}

param := &controller.UpdateUserStorylineRelationshipParam{}
if !parseJSON(ctx, param) {
	return
}

if ok, msg := param.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

userStorylineRelationship, err := ctrl.FinishStorylineLevel(ctx.Context(), ${id}, param)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json userStorylineRelationship
