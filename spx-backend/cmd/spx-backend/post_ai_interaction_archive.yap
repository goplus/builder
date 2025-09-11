// Archive a batch of interaction turns into a condensed summary for future context.
//
// Request:
//   POST /ai/interaction/archive

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

// FIXME: Uncomment the following line to ensure the user is authenticated once
// https://github.com/goplus/builder/issues/1673 is fixed.
// if _, ok := ensureAuthenticatedUser(ctx); !ok {
// 	return
// }

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
