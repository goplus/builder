// Archive a batch of interaction turns into a condensed summary for future context.
//
// Request:
//   POST /ai/interaction/archive

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

params := &controller.AIInteractionArchiveParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

result, err := ctrl.PerformAIInteractionArchive(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json result
