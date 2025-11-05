// Generate a stream by sending a list of input messages.
//
// Request:
//   POST /copilot/stream/message

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
read, err := ctrl.GenerateMessageStream(ctx.Context(), params, canUsePremium)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
defer read.Close()

consumeQuota(ctx, quotaResource, quotaAmount)

buf := make([]byte, 4096)
stream read, buf
