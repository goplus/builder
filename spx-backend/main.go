package main

import (
	"github.com/goplus/builder/Router"
	"github.com/goplus/builder/conf"
)

func main() {
	conf.Init(".env", true)
	y := Router.NewRouter()
	y.Run(":8080")
}
