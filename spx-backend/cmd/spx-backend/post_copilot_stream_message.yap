// Generate a stream by sending a list of input messages.
//
// Request:
//   POST /copilot/stream/message

import (
	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/controller"
	"github.com/goplus/builder/spx-backend/internal/log"
)

ctx := &Context
mUser, ok := ensureAuthenticatedUser(ctx)
if !ok {
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

canUsePremium := authz.UserCanUsePremiumLLM(ctx.Context())
read, err := ctrl.GenerateMessageStream(ctx.Context(), params, canUsePremium)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

// Consume quota after successful stream initiation.
if err := authorizer.ConsumeQuota(ctx.Context(), mUser.ID, authz.ResourceCopilotMessage, 1); err != nil {
	logger := log.GetReqLogger(ctx.Context())
	logger.Printf("failed to consume copilot quota: %v", err)
}

defer read.Close()

buf := make([]byte, 4096)
stream read, buf
