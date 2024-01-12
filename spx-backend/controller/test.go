package controller

import "github.com/goplus/yap"

func Test(ctx *yap.Context) {
	ctx.JSON(200, yap.H{
		"id": ctx.Param("id"),
	})
}
