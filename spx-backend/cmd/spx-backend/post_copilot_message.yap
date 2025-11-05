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

const (
	quotaResource = authz.ResourceCopilotMessage
	quotaAmount   = 1
)
if !ensureQuotaRemaining(ctx, quotaResource, quotaAmount) {
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

consumeQuota(ctx, quotaResource, quotaAmount)

json result
