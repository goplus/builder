// Perform instant image search with project keyword expansion.
//
// Request:
//   POST /search/instant

import (
	"github.com/goplus/builder/spx-backend/internal/controller"
)

ctx := &Context

params := &controller.InstantSearchParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

result, err := ctrl.InstantSearchImages(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

json result
