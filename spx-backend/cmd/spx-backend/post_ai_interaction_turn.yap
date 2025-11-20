// Send a message and context to the AI, receive a response including text and an optional command.
//
// Request:
//   POST /ai/interaction/turn

import (
	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

if !ensureQuotaRemaining(ctx, authz.ResourceAIInteractionTurn, 1) {
	return
}

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
