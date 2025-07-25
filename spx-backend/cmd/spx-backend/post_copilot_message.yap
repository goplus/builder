// Generate a message by sending a list of input messages.
//
// Request:
//   POST /copilot/message

import (
	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/controller"
	"github.com/goplus/builder/spx-backend/internal/log"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

// Check remaining quota.
if caps, ok := authz.UserCapabilitiesFromContext(ctx.Context()); ok {
	if caps.CopilotMessageQuotaLeft <= 0 {
		replyWithCodeMsg(ctx, errorTooManyRequests, "Copilot message quota exceeded")
		return
	}
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
if err := authz.ConsumeQuota(ctx.Context(), authz.ResourceCopilotMessage, 1); err != nil {
	logger := log.GetReqLogger(ctx.Context())
	logger.Printf("failed to consume copilot quota: %v", err)
}

json result
