package common

import (
	"github.com/goplus/yap"
)

func SetHeaders(ctx *yap.Context) {
	ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
	ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
	ctx.ResponseWriter.Header().Set("Access-Control-Allow-Methods", "*")
	ctx.ResponseWriter.Header().Set("Access-Control-Allow-Headers", "*")
}
