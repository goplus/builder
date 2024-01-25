package main

import (
	"context"
	"github.com/goplus/builder/spx-backend/internal/core"
	"github.com/goplus/yap"
	"os"
	"strconv"
)

type project struct {
	yap.App
	p *core.Project
}

//line cmd/project_yap.gox:12
func (this *project) MainEntry() {
	//line cmd/project_yap.gox:12:1
	todo := context.TODO()
	//line cmd/project_yap.gox:14:1
	this.Get("/project/:id", func(ctx *yap.Context) {
		//line cmd/project_yap.gox:15:1
		id := ctx.Param("id")
		//line cmd/project_yap.gox:16:1
		res, _ := this.p.FileInfo(todo, id)
		//line cmd/project_yap.gox:17:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "OK", "data": map[string]string{"id": res.ID, "address": os.Getenv("QINIU_PATH") + res.Address}})
	})
	//line cmd/project_yap.gox:24:1
	this.Post("/project/save", func(ctx *yap.Context) {
		//line cmd/project_yap.gox:25:1
		id := ctx.FormValue("id")
		//line cmd/project_yap.gox:26:1
		uid := ctx.FormValue("uid")
		//line cmd/project_yap.gox:27:1
		name := ctx.FormValue("name")
		//line cmd/project_yap.gox:28:1
		isPublic := ctx.FormValue("isPublic")
		//line cmd/project_yap.gox:29:1
		ip, _ := strconv.Atoi(isPublic)
		//line cmd/project_yap.gox:30:1
		file, header, _ := ctx.FormFile("file")
		//line cmd/project_yap.gox:31:1
		codeFile := &core.CodeFile{ID: id, Name: name, AuthorId: uid, IsPublic: ip, Status: 1}
		//line cmd/project_yap.gox:38:1
		res, _ := this.p.SaveProject(todo, codeFile, file, header)
		//line cmd/project_yap.gox:39:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": map[string]string{"id": res.ID, "address": os.Getenv("QINIU_PATH") + res.Address}})
	})
	//line cmd/project_yap.gox:47:1
	this.Post("/project/fmt", func(ctx *yap.Context) {
		//line cmd/project_yap.gox:48:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
		//line cmd/project_yap.gox:49:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
		//line cmd/project_yap.gox:50:1
		body := ctx.FormValue("body")
		//line cmd/project_yap.gox:51:1
		imports := ctx.FormValue("import")
		//line cmd/project_yap.gox:52:1
		res := this.p.CodeFmt(todo, body, imports)
		//line cmd/project_yap.gox:53:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": res})
	})
	//line cmd/project_yap.gox:60:1
	this.Get("/asset/:id", func(ctx *yap.Context) {
		//line cmd/project_yap.gox:61:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
		//line cmd/project_yap.gox:62:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
		//line cmd/project_yap.gox:63:1
		id := ctx.Param("id")
		//line cmd/project_yap.gox:64:1
		asset, _ := this.p.Asset(todo, id)
		//line cmd/project_yap.gox:65:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": map[string]*core.Asset{"asset": asset}})
	})
	//line cmd/project_yap.gox:72:1
	this.Post("/asset/upload", func(ctx *yap.Context) {
		//line cmd/project_yap.gox:73:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
		//line cmd/project_yap.gox:74:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
		//line cmd/project_yap.gox:75:1
		uid := ctx.FormValue("uid")
		//line cmd/project_yap.gox:76:1
		name := ctx.FormValue("name")
		//line cmd/project_yap.gox:77:1
		category := ctx.FormValue("category")
		//line cmd/project_yap.gox:78:1
		isPublic := ctx.FormValue("isPublic")
		//line cmd/project_yap.gox:79:1
		assetType := ctx.FormValue("assetType")
		//line cmd/project_yap.gox:80:1
		ip, _ := strconv.Atoi(isPublic)
		//line cmd/project_yap.gox:81:1
		file, header, _ := ctx.FormFile("file")
		//line cmd/project_yap.gox:82:1
		asset := &core.Asset{Name: name, AuthorId: uid, Category: category, IsPublic: ip, AssetType: assetType, Status: 1}
		//line cmd/project_yap.gox:90:1
		res, _ := this.p.UploadAsset(todo, asset, file, header)
		//line cmd/project_yap.gox:91:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": map[string]string{"id": res.ID, "address": os.Getenv("QINIU_PATH") + res.Address}})
	})
	//line cmd/project_yap.gox:97:1
	this.Get("/list/asset/:pageIndex/:pageSize/:assetType", func(ctx *yap.Context) {
		//line cmd/project_yap.gox:98:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
		//line cmd/project_yap.gox:99:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
		//line cmd/project_yap.gox:100:1
		pageIndex := ctx.Param("pageIndex")
		//line cmd/project_yap.gox:101:1
		pageSize := ctx.Param("pageSize")
		//line cmd/project_yap.gox:102:1
		assetType := ctx.Param("assetType")
		//line cmd/project_yap.gox:103:1
		result, _ := this.p.AssetList(todo, pageIndex, pageSize, assetType)
		//line cmd/project_yap.gox:104:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": result})
	})
	//line cmd/project_yap.gox:110:1
	this.Get("/list/pubProject/:pageIndex/:pageSize", func(ctx *yap.Context) {
		//line cmd/project_yap.gox:111:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
		//line cmd/project_yap.gox:112:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
		//line cmd/project_yap.gox:113:1
		pageIndex := ctx.Param("pageIndex")
		//line cmd/project_yap.gox:114:1
		pageSize := ctx.Param("pageSize")
		//line cmd/project_yap.gox:115:1
		result, _ := this.p.PubProjectList(todo, pageIndex, pageSize)
		//line cmd/project_yap.gox:116:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": result})
	})
	//line cmd/project_yap.gox:122:1
	this.Get("/list/userProject/:uid/:pageIndex/:pageSize", func(ctx *yap.Context) {
		//line cmd/project_yap.gox:123:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
		//line cmd/project_yap.gox:124:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
		//line cmd/project_yap.gox:125:1
		pageIndex := ctx.Param("pageIndex")
		//line cmd/project_yap.gox:126:1
		pageSize := ctx.Param("pageSize")
		//line cmd/project_yap.gox:127:1
		uid := ctx.Param("uid")
		//line cmd/project_yap.gox:128:1
		result, _ := this.p.UserProjectList(todo, pageIndex, pageSize, uid)
		//line cmd/project_yap.gox:129:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": result})
	})
	//line cmd/project_yap.gox:135:1
	this.Post("/project/updateIsPublic", func(ctx *yap.Context) {
		//line cmd/project_yap.gox:136:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
		//line cmd/project_yap.gox:137:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
		//line cmd/project_yap.gox:138:1
		id := ctx.FormValue("id")
		//line cmd/project_yap.gox:139:1
		_ = this.p.UpdatePublic(todo, id)
		//line cmd/project_yap.gox:140:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": ""})
	})
	//line cmd/project_yap.gox:147:1
	conf := &core.Config{}
	//line cmd/project_yap.gox:148:1
	this.p, _ = core.New(todo, conf)
	//line cmd/project_yap.gox:150:1
	this.Run__1(":8080")
}
func main() {
	yap.Gopt_App_Main(new(project))
}
