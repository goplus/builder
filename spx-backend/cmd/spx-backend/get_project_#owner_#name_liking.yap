// Check if a project is liked by the authenticated user.
//
// Request:
//   GET /project/:owner/:name/liking

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, isAuthed := ensureAuthedUser(ctx); !isAuthed {
	return
}

projectFullName := controller.ProjectFullName{Owner: ${owner}, Project: ${name}}
hasLiked, err := ctrl.HasLikedProject(ctx.Context(), projectFullName)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
if hasLiked {
	ctx.text 204, "", ""
} else {
	replyWithCode(ctx, errorNotFound)
}
