package yaputil

import (
	"context"

	"github.com/goplus/yap"
)

// GetCtx get context based on a yap context
func GetCtx(ctx *yap.Context) context.Context {
	return ctx.Request.Context()
}
