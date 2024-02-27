package main

import (
	"context"
	"encoding/json"
	"github.com/goplus/builder/spx-backend/internal/common"
	"github.com/goplus/builder/spx-backend/internal/core"
	"github.com/goplus/yap"
	"io"
	"os"
	"strconv"
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
	this.Post("/asset/upload", func(ctx *yap.Context) {
//line cmd/project_yap.gox:135:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:136:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:137:1
		uid := ctx.FormValue("uid")
//line cmd/project_yap.gox:138:1
		name := ctx.FormValue("name")
//line cmd/project_yap.gox:139:1
		category := ctx.FormValue("category")
//line cmd/project_yap.gox:140:1
		isPublic := ctx.FormValue("isPublic")
//line cmd/project_yap.gox:141:1
		assetType := ctx.FormValue("assetType")
//line cmd/project_yap.gox:142:1
		ip, _ := strconv.Atoi(isPublic)
//line cmd/project_yap.gox:143:1
		file, header, _ := ctx.FormFile("file")
//line cmd/project_yap.gox:144:1
		asset := &core.Asset{Name: name, AuthorId: uid, Category: category, IsPublic: ip, AssetType: assetType, Status: 1}
//line cmd/project_yap.gox:152:1
		res, _ := this.p.UploadAsset(todo, asset, file, header)
//line cmd/project_yap.gox:153:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": map[string]string{"id": res.ID, "address": os.Getenv("QINIU_PATH") + res.Address}})
	})
//line cmd/project_yap.gox:159:1
	this.Post("/spirits/upload", func(ctx *yap.Context) {
//line cmd/project_yap.gox:160:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:161:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:162:1
		ctx.ParseMultipartForm(10 << 20)
//line cmd/project_yap.gox:163:1
		files := ctx.MultipartForm.File["files"]
//line cmd/project_yap.gox:164:1
		name := ctx.FormValue("name")
//line cmd/project_yap.gox:165:1
		path, err := this.p.UploadSpirits(todo, name, files)
//line cmd/project_yap.gox:166:1
		if err != nil {
//line cmd/project_yap.gox:167:1
			ctx.Json__1(map[string]interface {
			}{"code": 400, "msg": "Failed to read request body"})
//line cmd/project_yap.gox:171:1
			return
		}
//line cmd/project_yap.gox:173:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": path})
	})
//line cmd/project_yap.gox:180:1
	this.Post("/asset/save", func(ctx *yap.Context) {
//line cmd/project_yap.gox:181:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:182:1
		id := ctx.FormValue("id")
//line cmd/project_yap.gox:183:1
		uid := ctx.FormValue("uid")
//line cmd/project_yap.gox:184:1
		name := ctx.FormValue("name")
//line cmd/project_yap.gox:185:1
		category := ctx.FormValue("category")
//line cmd/project_yap.gox:186:1
		isPublic := ctx.FormValue("isPublic")
//line cmd/project_yap.gox:187:1
		assetType := ctx.FormValue("assetType")
//line cmd/project_yap.gox:188:1
		ip, _ := strconv.Atoi(isPublic)
//line cmd/project_yap.gox:189:1
		file, header, _ := ctx.FormFile("file")
//line cmd/project_yap.gox:190:1
		asset := &core.Asset{ID: id, Name: name, AuthorId: uid, Category: category, IsPublic: ip, AssetType: assetType, Status: 1}
//line cmd/project_yap.gox:199:1
		_, _ = this.p.SaveAsset(todo, asset, file, header)
//line cmd/project_yap.gox:200:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": ""})
	})
//line cmd/project_yap.gox:207:1
	this.Get("/list/asset/:pageIndex/:pageSize/:assetType", func(ctx *yap.Context) {
//line cmd/project_yap.gox:208:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:209:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:210:1
		pageIndex := ctx.Param("pageIndex")
//line cmd/project_yap.gox:211:1
		pageSize := ctx.Param("pageSize")
//line cmd/project_yap.gox:212:1
		assetType := ctx.Param("assetType")
//line cmd/project_yap.gox:213:1
		category := ctx.Param("category")
//line cmd/project_yap.gox:214:1
		isOrderByTime := ctx.Param("isOrderByTime")
//line cmd/project_yap.gox:215:1
		isOrderByHot := ctx.Param("isOrderByHot")
//line cmd/project_yap.gox:216:1
		uid := ctx.Param("uid")
//line cmd/project_yap.gox:217:1
		result, _ := this.p.AssetList(todo, pageIndex, pageSize, assetType, category, isOrderByTime, isOrderByHot, uid)
//line cmd/project_yap.gox:218:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": result})
	})
//line cmd/project_yap.gox:226:1
	this.Get("/clickCount/asset/:id/:assetType", func(ctx *yap.Context) {
//line cmd/project_yap.gox:227:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:228:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:229:1
		id := ctx.Param("id")
//line cmd/project_yap.gox:230:1
		assetType := ctx.Param("assetType")
//line cmd/project_yap.gox:231:1
		this.p.IncrementAssetClickCount(todo, id, assetType)
//line cmd/project_yap.gox:232:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": ""})
	})
//line cmd/project_yap.gox:239:1
	this.Get("/list/pubProject/:pageIndex/:pageSize", func(ctx *yap.Context) {
//line cmd/project_yap.gox:240:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:241:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:242:1
		pageIndex := ctx.Param("pageIndex")
//line cmd/project_yap.gox:243:1
		pageSize := ctx.Param("pageSize")
//line cmd/project_yap.gox:244:1
		result, _ := this.p.PubProjectList(todo, pageIndex, pageSize)
//line cmd/project_yap.gox:245:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": result})
	})
//line cmd/project_yap.gox:251:1
	this.Get("/list/userProject/:uid/:pageIndex/:pageSize", func(ctx *yap.Context) {
//line cmd/project_yap.gox:252:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:253:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:254:1
		pageIndex := ctx.Param("pageIndex")
//line cmd/project_yap.gox:255:1
		pageSize := ctx.Param("pageSize")
//line cmd/project_yap.gox:256:1
		uid := ctx.Param("uid")
//line cmd/project_yap.gox:257:1
		result, _ := this.p.UserProjectList(todo, pageIndex, pageSize, uid)
//line cmd/project_yap.gox:258:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": result})
	})
//line cmd/project_yap.gox:264:1
	this.Post("/project/updateIsPublic", func(ctx *yap.Context) {
//line cmd/project_yap.gox:265:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:266:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:267:1
		id := ctx.FormValue("id")
//line cmd/project_yap.gox:268:1
		_ = this.p.UpdatePublic(todo, id)
//line cmd/project_yap.gox:269:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": ""})
	})
//line cmd/project_yap.gox:275:1
	this.Post("/asset/search", func(ctx *yap.Context) {
//line cmd/project_yap.gox:276:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:277:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:278:1
		search := ctx.FormValue("search")
//line cmd/project_yap.gox:279:1
		assetType := ctx.FormValue("assetType")
//line cmd/project_yap.gox:280:1
		assets, _ := this.p.SearchAsset(todo, search, assetType)
//line cmd/project_yap.gox:281:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": assets})
	})
//line cmd/project_yap.gox:288:1
	conf := &core.Config{}
//line cmd/project_yap.gox:289:1
	this.p, _ = core.New(todo, conf)
//line cmd/project_yap.gox:291:1
	this.Run(":8080")
}
func main() {
//line cmd/project_yap.gox:291:1
	yap.Gopt_App_Main(new(project))
}
