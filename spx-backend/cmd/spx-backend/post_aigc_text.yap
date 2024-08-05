// Get text suggestion from AI.
//
// Request:
//   POST /aigc/text

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

_, ok := ensureUser(ctx)
if !ok {
	return
}

//todo: add ctrl handler

if err != nil {
	replyWithInnerError(ctx, err)
	return
}

