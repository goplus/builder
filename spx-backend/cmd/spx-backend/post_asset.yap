// Create an asset.
//
// Request:
//   POST /asset

import (
	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/controller"
	"github.com/goplus/builder/spx-backend/internal/model"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

params := &controller.CreateAssetParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

if !authz.CanManageAssets(ctx.Context()) {
	if params.Visibility == model.VisibilityPublic {
		replyWithCodeMsg(ctx, errorForbidden, "You are not allowed to create public assets")
		return
	}
}

asset, err := ctrl.CreateAsset(ctx.Context(), params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json 201, asset
