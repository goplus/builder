// 游戏素材名称自动补全

// POST /game-assets/complete

ctx := &Context
if _, ok := ensureAuthenticatedUser(ctx); !ok {
	return
}

// 解析JSON请求体
var req struct {
	Prefix string `json:"prefix"`
	Limit  int    `json:"limit"`
}

if !parseJSON(ctx, &req) {
	return
}

if req.Prefix == "" {
	replyWithCodeMsg(ctx, errorInvalidArgs, "prefix parameter is required")
	return
}

limit := req.Limit
if limit <= 0 {
	limit = 5
}
prefix := req.Prefix

names, err := ctrl.CompleteGameAssetName(ctx.Context(), prefix, limit)
if err != nil {
	replyWithInnerError(ctx, err)
	return
}

ctx.Json map[string]any{
	"success": true,
	"data": map[string]any{
		"suggestions": names,
		"prefix":      prefix,
		"total":       len(names),
	},
}
