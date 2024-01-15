package main

import (
	"github.com/goplus/yap"
	"context"
	"github.com/goplus/builder/internal/core"
)

type project struct {
	yap.App
	p *core.Project
}
//line cmd/project_yap.gox:11
func (this *project) MainEntry() {
//line cmd/project_yap.gox:11:1
	todo := context.TODO()
//line cmd/project_yap.gox:13:1
	this.Get("/code/:id", func(ctx *yap.Context) {
//line cmd/project_yap.gox:14:1
		id := ctx.Param("id")
//line cmd/project_yap.gox:15:1
		cloudFile, _ := this.p.FileInfo(todo, id)
//line cmd/project_yap.gox:16:1
		ctx.Json__1(map[string]string{"id": ctx.Param("id"), "address": cloudFile.Address})
	})
//line cmd/project_yap.gox:23:1
	conf := &core.Config{}
//line cmd/project_yap.gox:24:1
	this.p, _ = core.New(todo, conf)
//line cmd/project_yap.gox:26:1
	this.Run__1(":8080")
}
func main() {
	yap.Gopt_App_Main(new(project))
}
