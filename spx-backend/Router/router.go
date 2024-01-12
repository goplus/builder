package Router

import (
	"github.com/goplus/builder/controller"
	"github.com/goplus/yap"
)

func NewRouter() *yap.Engine {
	y := yap.New()
	y.GET("/p/:id", controller.Test)
	return y

}
