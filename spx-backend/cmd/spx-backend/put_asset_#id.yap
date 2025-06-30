// Update an asset.
//
// Request:
//   PUT /asset/:id

import (
	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/controller"
	"github.com/goplus/builder/spx-backend/internal/model"
)

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

params := &controller.UpdateAssetParams{}
if !parseJSON(ctx, params) {
	return
}
if ok, msg := params.Validate(); !ok {
	replyWithCodeMsg(ctx, errorInvalidArgs, msg)
	return
}

if !authz.UserCanManageAssets(ctx.Context()) {
	if params.Visibility == model.VisibilityPublic {
		replyWithCodeMsg(ctx, errorForbidden, "You are not allowed to make assets public")
		return
	}
}

asset, err := ctrl.UpdateAsset(ctx.Context(), ${id}, params)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}
json asset
