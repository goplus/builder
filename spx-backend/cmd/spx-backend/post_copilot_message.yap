// Generate a message by sending a list of input messages.
//
// Request:
//   POST /copilot/message

import (
	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

// Enforce rate limit.
if !ensureRateLimit(ctx, authz.ResourceCopilotMessage) {
	return
}

// Check remaining quota.
if !ensureQuotaLeft(ctx, authz.ResourceCopilotMessage) {
	return
}

params := &controller.GenerateMessageParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

canUsePremium := authz.CanUsePremiumLLM(ctx.Context())
result, err := ctrl.GenerateMessage(ctx.Context(), params, canUsePremium)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

// Consume quota after successful generation.
consumeQuota(ctx, authz.ResourceCopilotMessage, 1)

json result
