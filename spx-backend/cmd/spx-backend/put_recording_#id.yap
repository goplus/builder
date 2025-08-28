// Update record by ID.
//
// Request:
//   PUT /record/:id

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

params := &controller.UpdateRecordParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

record, err := ctrl.UpdateRecord(ctx.Context(), ${id}, params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json record