// Generate AI-powered descriptive summary of a game from the player's perspective.
//
// Request:
//   POST /ai/description

import (
	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

if !ensureQuotaRemaining(ctx, authz.ResourceAIDescription, 1) {
	return
}

params := &controller.AIDescriptionParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

result, err := ctrl.GenerateAIDescription(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

json result
