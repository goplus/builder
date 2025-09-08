// Generate or update project context keywords.
//
// Request:
//   POST /project/context/generate

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

params := &controller.ProjectContextParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

result, err := ctrl.GenerateProjectContext(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

json result
