package main

import (
	"context"
	"encoding/json"
	"github.com/goplus/builder/spx-backend/internal/common"
	"github.com/goplus/builder/spx-backend/internal/core"
	"github.com/goplus/yap"
	"io"
)

const _ = true

type project struct {
	yap.App
	p *core.Project
}

//line cmd/project_yap.gox:16
func (this *project) MainEntry() {
//line cmd/project_yap.gox:16:1
	todo := context.TODO()
//line cmd/project_yap.gox:18:1
	this.Get("/project/detail/:id", func(ctx *yap.Context) {
//line cmd/project_yap.gox:19:1
		id := ctx.Param("id")
//line cmd/project_yap.gox:20:1
		res, err := this.p.GetProjectDetail(todo, id)
//line cmd/project_yap.gox:21:1
		if err != nil {
//line cmd/project_yap.gox:22:1
			ctx.Json__1(map[string]interface {
			}{"code": 400, "msg": "Failed to get project detail"})
//line cmd/project_yap.gox:26:1
			return
		}
//line cmd/project_yap.gox:28:1
		var files map[string]string
//line cmd/project_yap.gox:29:1
		err = json.Unmarshal([]byte(res.Address), &files)
//line cmd/project_yap.gox:30:1
		if err != nil {
//line cmd/project_yap.gox:31:1
			ctx.Json__1(map[string]interface {
			}{"code": 400, "msg": "Failed to parse project files"})
//line cmd/project_yap.gox:35:1
			return
		}
//line cmd/project_yap.gox:37:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": map[string]interface {
		}{"id": res.ID, "name": res.Name, "authorId": res.AuthorId, "files": files, "version": res.Version, "isPublic": res.IsPublic, "status": res.Status, "createdAt": res.Ctime, "updatedAt": res.Utime}})
	})
//line cmd/project_yap.gox:54:1
	this.Post("/project/save", func(ctx *yap.Context) {
//line cmd/project_yap.gox:55:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:56:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:57:1
		var req core.SaveProjectRequest
//line cmd/project_yap.gox:58:1
		body, err := io.ReadAll(ctx.Request.Body)
//line cmd/project_yap.gox:59:1
		if err != nil {
//line cmd/project_yap.gox:60:1
			ctx.Json__1(map[string]interface {
			}{"code": 400, "msg": "Failed to read request body"})
//line cmd/project_yap.gox:64:1
			return
		}
//line cmd/project_yap.gox:66:1
		err = json.Unmarshal(body, &req)
//line cmd/project_yap.gox:67:1
		if err != nil {
//line cmd/project_yap.gox:68:1
			ctx.Json__1(map[string]interface {
			}{"code": 400, "msg": err.Error()})
//line cmd/project_yap.gox:72:1
			return
		}
//line cmd/project_yap.gox:74:1
		res, err := this.p.SaveProject(todo, req)
//line cmd/project_yap.gox:75:1
		if err != nil {
//line cmd/project_yap.gox:76:1
			ctx.Json__1(map[string]interface {
			}{"code": 400, "msg": "Failed to save project:" + err.Error()})
//line cmd/project_yap.gox:80:1
			return
		}
//line cmd/project_yap.gox:82:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": map[string]interface {
		}{"id": res.ID, "name": res.Name, "authorId": res.AuthorId, "files": req.Files, "version": res.Version, "isPublic": res.IsPublic, "status": res.Status, "createdAt": res.Ctime, "updatedAt": res.Utime}})
	})
//line cmd/project_yap.gox:99:1
	this.Get("/project/upload-token", func(ctx *yap.Context) {
//line cmd/project_yap.gox:100:1
		token, _ := common.GenerateUploadToken()
//line cmd/project_yap.gox:101:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": token})
	})
//line cmd/project_yap.gox:109:1
	this.Post("/project/fmt", func(ctx *yap.Context) {
//line cmd/project_yap.gox:110:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:111:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:112:1
		body := ctx.FormValue("body")
//line cmd/project_yap.gox:113:1
		imports := ctx.FormValue("import")
//line cmd/project_yap.gox:114:1
		res := this.p.CodeFmt(todo, body, imports)
//line cmd/project_yap.gox:115:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": res})
	})
//line cmd/project_yap.gox:122:1
	this.Get("/asset/:id", func(ctx *yap.Context) {
//line cmd/project_yap.gox:123:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:124:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:125:1
		id := ctx.Param("id")
//line cmd/project_yap.gox:126:1
		asset, _ := this.p.Asset(todo, id)
//line cmd/project_yap.gox:127:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": map[string]*core.Asset{"asset": asset}})
	})
//line cmd/project_yap.gox:134:1
	this.Get("/list/asset/:pageIndex/:pageSize/:assetType", func(ctx *yap.Context) {
//line cmd/project_yap.gox:135:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:136:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:137:1
		pageIndex := ctx.Param("pageIndex")
//line cmd/project_yap.gox:138:1
		pageSize := ctx.Param("pageSize")
//line cmd/project_yap.gox:139:1
		assetType := ctx.Param("assetType")
//line cmd/project_yap.gox:140:1
		result, _ := this.p.AssetList(todo, pageIndex, pageSize, assetType)
//line cmd/project_yap.gox:141:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": result})
	})
//line cmd/project_yap.gox:148:1
	conf := &core.Config{}
//line cmd/project_yap.gox:149:1
	this.p, _ = core.New(todo, conf)
//line cmd/project_yap.gox:151:1
	this.Run(":8080")
}
func main() {
//line cmd/project_yap.gox:151:1
	yap.Gopt_App_Main(new(project))
}
