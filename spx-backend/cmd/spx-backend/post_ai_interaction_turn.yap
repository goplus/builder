// Send a message and context to the AI, receive a response including text and an optional command.
//
// Request:
//   POST /ai/interaction/turn

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

// FIXME: Uncomment the following line to ensure the user is authenticated once
// https://github.com/goplus/builder/issues/1673 is fixed.
// if _, ok := ensureAuthenticatedUser(ctx); !ok {
// 	return
// }

params := &controller.AIInteractionTurnParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

result, err := ctrl.PerformAIInteractionTurn(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json result
