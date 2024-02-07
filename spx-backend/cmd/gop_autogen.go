package main

import (
	"context"
	"encoding/json"
	"github.com/goplus/builder/spx-backend/internal/core"
	"github.com/goplus/yap"
	"os"
	"strconv"
)

const _ = true

type project struct {
	yap.App
	p *core.Project
}

//line cmd/project_yap.gox:13
func (this *project) MainEntry() {
//line cmd/project_yap.gox:13:1
	todo := context.TODO()
//line cmd/project_yap.gox:15:1
	this.Get("/project/:id", func(ctx *yap.Context) {
//line cmd/project_yap.gox:16:1
		id := ctx.Param("id")
//line cmd/project_yap.gox:17:1
		res, _ := this.p.FileInfo(todo, id)
//line cmd/project_yap.gox:18:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "OK", "data": map[string]string{"id": res.ID, "address": os.Getenv("QINIU_PATH") + res.Address}})
	})
//line cmd/project_yap.gox:25:1
	this.Post("/project/save", func(ctx *yap.Context) {
//line cmd/project_yap.gox:26:1
		id := ctx.FormValue("id")
//line cmd/project_yap.gox:27:1
		uid := ctx.FormValue("uid")
//line cmd/project_yap.gox:28:1
		name := ctx.FormValue("name")
//line cmd/project_yap.gox:29:1
		isPublic := ctx.FormValue("isPublic")
//line cmd/project_yap.gox:30:1
		ip, _ := strconv.Atoi(isPublic)
//line cmd/project_yap.gox:31:1
		file, header, _ := ctx.FormFile("file")
//line cmd/project_yap.gox:32:1
		codeFile := &core.CodeFile{ID: id, Name: name, AuthorId: uid, IsPublic: ip, Status: 1}
//line cmd/project_yap.gox:39:1
		res, _ := this.p.SaveProject(todo, codeFile, file, header)
//line cmd/project_yap.gox:40:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": map[string]string{"id": res.ID, "address": os.Getenv("QINIU_PATH") + res.Address}})
	})
//line cmd/project_yap.gox:47:1
	this.Post("/project/check-update", func(ctx *yap.Context) {
//line cmd/project_yap.gox:48:1
		var fileInfoWrapper core.FileInfoWrapper
//line cmd/project_yap.gox:49:1
		err := json.NewDecoder(ctx.Body).Decode(&fileInfoWrapper)
//line cmd/project_yap.gox:50:1
		if err != nil {
//line cmd/project_yap.gox:51:1
			ctx.Json__1(map[string]interface {
			}{"code": 500, "msg": "err"})
		}
//line cmd/project_yap.gox:56:1
		res, _ := this.p.CheckUpdate(todo, fileInfoWrapper.FileInfo)
//line cmd/project_yap.gox:57:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": res})
	})
//line cmd/project_yap.gox:64:1
	this.Post("/project/upload", func(ctx *yap.Context) {
//line cmd/project_yap.gox:65:1
		err := ctx.ParseMultipartForm(10 << 20)
//line cmd/project_yap.gox:66:1
		if err != nil {
//line cmd/project_yap.gox:67:1
			ctx.Json__1(map[string]interface {
			}{"code": 500, "msg": "err"})
		}
//line cmd/project_yap.gox:72:1
		relativePath := ctx.FormValue("relativePath")
//line cmd/project_yap.gox:73:1
		file, _, _ := ctx.FormFile("file")
//line cmd/project_yap.gox:74:1
		err = this.p.UploadFile(todo, relativePath, file)
//line cmd/project_yap.gox:75:1
		if err != nil {
//line cmd/project_yap.gox:76:1
			ctx.Json__1(map[string]interface {
			}{"code": 500, "msg": err})
		} else {
//line cmd/project_yap.gox:81:1
			ctx.Json__1(map[string]interface {
			}{"code": 200, "msg": "ok"})
		}
	})
//line cmd/project_yap.gox:88:1
	this.Post("/project/fmt", func(ctx *yap.Context) {
//line cmd/project_yap.gox:89:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:90:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:91:1
		body := ctx.FormValue("body")
//line cmd/project_yap.gox:92:1
		imports := ctx.FormValue("import")
//line cmd/project_yap.gox:93:1
		res := this.p.CodeFmt(todo, body, imports)
//line cmd/project_yap.gox:94:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": res})
	})
//line cmd/project_yap.gox:101:1
	this.Get("/asset/:id", func(ctx *yap.Context) {
//line cmd/project_yap.gox:102:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:103:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:104:1
		id := ctx.Param("id")
//line cmd/project_yap.gox:105:1
		asset, _ := this.p.Asset(todo, id)
//line cmd/project_yap.gox:106:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": map[string]*core.Asset{"asset": asset}})
	})
//line cmd/project_yap.gox:113:1
	this.Post("/asset/upload", func(ctx *yap.Context) {
//line cmd/project_yap.gox:114:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:115:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:116:1
		uid := ctx.FormValue("uid")
//line cmd/project_yap.gox:117:1
		name := ctx.FormValue("name")
//line cmd/project_yap.gox:118:1
		category := ctx.FormValue("category")
//line cmd/project_yap.gox:119:1
		isPublic := ctx.FormValue("isPublic")
//line cmd/project_yap.gox:120:1
		assetType := ctx.FormValue("assetType")
//line cmd/project_yap.gox:121:1
		ip, _ := strconv.Atoi(isPublic)
//line cmd/project_yap.gox:122:1
		file, header, _ := ctx.FormFile("file")
//line cmd/project_yap.gox:123:1
		asset := &core.Asset{Name: name, AuthorId: uid, Category: category, IsPublic: ip, AssetType: assetType, Status: 1}
//line cmd/project_yap.gox:131:1
		res, _ := this.p.UploadAsset(todo, asset, file, header)
//line cmd/project_yap.gox:132:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": map[string]string{"id": res.ID, "address": os.Getenv("QINIU_PATH") + res.Address}})
	})
//line cmd/project_yap.gox:139:1
	this.Post("/asset/save", func(ctx *yap.Context) {
//line cmd/project_yap.gox:140:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:141:1
		id := ctx.FormValue("id")
//line cmd/project_yap.gox:142:1
		uid := ctx.FormValue("uid")
//line cmd/project_yap.gox:143:1
		name := ctx.FormValue("name")
//line cmd/project_yap.gox:144:1
		category := ctx.FormValue("category")
//line cmd/project_yap.gox:145:1
		isPublic := ctx.FormValue("isPublic")
//line cmd/project_yap.gox:146:1
		assetType := ctx.FormValue("assetType")
//line cmd/project_yap.gox:147:1
		ip, _ := strconv.Atoi(isPublic)
//line cmd/project_yap.gox:148:1
		file, header, _ := ctx.FormFile("file")
//line cmd/project_yap.gox:149:1
		asset := &core.Asset{ID: id, Name: name, AuthorId: uid, Category: category, IsPublic: ip, AssetType: assetType, Status: 1}
//line cmd/project_yap.gox:158:1
		_, _ = this.p.SaveAsset(todo, asset, file, header)
//line cmd/project_yap.gox:159:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": ""})
	})
//line cmd/project_yap.gox:166:1
	this.Get("/list/asset/:pageIndex/:pageSize/:assetType", func(ctx *yap.Context) {
//line cmd/project_yap.gox:167:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:168:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:169:1
		pageIndex := ctx.Param("pageIndex")
//line cmd/project_yap.gox:170:1
		pageSize := ctx.Param("pageSize")
//line cmd/project_yap.gox:171:1
		assetType := ctx.Param("assetType")
//line cmd/project_yap.gox:172:1
		category := ctx.Param("category")
//line cmd/project_yap.gox:173:1
		result, _ := this.p.AssetList(todo, pageIndex, pageSize, assetType, category)
//line cmd/project_yap.gox:174:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": result})
	})
//line cmd/project_yap.gox:181:1
	this.Get("/list/pubProject/:pageIndex/:pageSize", func(ctx *yap.Context) {
//line cmd/project_yap.gox:182:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:183:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:184:1
		pageIndex := ctx.Param("pageIndex")
//line cmd/project_yap.gox:185:1
		pageSize := ctx.Param("pageSize")
//line cmd/project_yap.gox:186:1
		result, _ := this.p.PubProjectList(todo, pageIndex, pageSize)
//line cmd/project_yap.gox:187:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": result})
	})
//line cmd/project_yap.gox:193:1
	this.Get("/list/userProject/:uid/:pageIndex/:pageSize", func(ctx *yap.Context) {
//line cmd/project_yap.gox:194:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:195:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:196:1
		pageIndex := ctx.Param("pageIndex")
//line cmd/project_yap.gox:197:1
		pageSize := ctx.Param("pageSize")
//line cmd/project_yap.gox:198:1
		uid := ctx.Param("uid")
//line cmd/project_yap.gox:199:1
		result, _ := this.p.UserProjectList(todo, pageIndex, pageSize, uid)
//line cmd/project_yap.gox:200:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": result})
	})
//line cmd/project_yap.gox:206:1
	this.Post("/project/updateIsPublic", func(ctx *yap.Context) {
//line cmd/project_yap.gox:207:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:208:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:209:1
		id := ctx.FormValue("id")
//line cmd/project_yap.gox:210:1
		_ = this.p.UpdatePublic(todo, id)
//line cmd/project_yap.gox:211:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": ""})
	})
//line cmd/project_yap.gox:217:1
	this.Post("/asset/search", func(ctx *yap.Context) {
//line cmd/project_yap.gox:218:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:219:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:220:1
		search := ctx.FormValue("search")
//line cmd/project_yap.gox:221:1
		assetType := ctx.FormValue("assetType")
//line cmd/project_yap.gox:222:1
		assets, _ := this.p.SearchAsset(todo, search, assetType)
//line cmd/project_yap.gox:223:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": assets})
	})
//line cmd/project_yap.gox:230:1
	conf := &core.Config{}
//line cmd/project_yap.gox:231:1
	this.p, _ = core.New(todo, conf)
//line cmd/project_yap.gox:233:1
	this.Run(":8080")
}
func main() {
//line cmd/project_yap.gox:233:1
	yap.Gopt_App_Main(new(project))
}
