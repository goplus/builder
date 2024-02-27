package main

import (
	"context"
	"fmt"
	"github.com/goplus/builder/spx-backend/internal/common"
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

//line cmd/project_yap.gox:16
func (this *project) MainEntry() {
//line cmd/project_yap.gox:16:1
	todo := context.TODO()
//line cmd/project_yap.gox:18:1
	this.Options("/", func(ctx *yap.Context) {
//line cmd/project_yap.gox:19:1
		common.SetHeaders(ctx)
//line cmd/project_yap.gox:20:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok"})
	})
//line cmd/project_yap.gox:26:1
	this.Get("/project", func(ctx *yap.Context) {
//line cmd/project_yap.gox:27:1
		id := ctx.Param("id")
//line cmd/project_yap.gox:28:1
		res, _ := this.p.FileInfo(todo, id)
//line cmd/project_yap.gox:29:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "OK", "data": map[string]string{"id": res.ID, "address": os.Getenv("QINIU_PATH") + "/" + res.Address}})
	})
//line cmd/project_yap.gox:37:1
	this.Post("/project/allsave", func(ctx *yap.Context) {
//line cmd/project_yap.gox:38:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:39:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Credentials", "true")
//line cmd/project_yap.gox:40:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:41:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
//line cmd/project_yap.gox:42:1
		id := ctx.FormValue("id")
//line cmd/project_yap.gox:43:1
		userId := ""
//line cmd/project_yap.gox:44:1
		token := core.GetToken(ctx)
//line cmd/project_yap.gox:45:1
		user, err := this.p.GetUser(token)
//line cmd/project_yap.gox:46:1
		if err != nil {
//line cmd/project_yap.gox:47:1
			fmt.Printf("get user error:", err)
		} else {
//line cmd/project_yap.gox:49:1
			userId = user.Id
		}
//line cmd/project_yap.gox:51:1
		name := ctx.FormValue("name")
//line cmd/project_yap.gox:52:1
		file, header, _ := ctx.FormFile("file")
//line cmd/project_yap.gox:53:1
		codeFile := &core.CodeFile{ID: id, Name: name, AuthorId: userId}
//line cmd/project_yap.gox:58:1
		res, _ := this.p.SaveAllProject(todo, codeFile, file, header)
//line cmd/project_yap.gox:59:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": map[string]string{"id": res.ID, "address": os.Getenv("QINIU_PATH") + "/" + res.Address}})
	})
//line cmd/project_yap.gox:67:1
	this.Post("/project/fmt", func(ctx *yap.Context) {
//line cmd/project_yap.gox:68:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:69:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:70:1
		body := ctx.FormValue("body")
//line cmd/project_yap.gox:71:1
		imports := ctx.FormValue("import")
//line cmd/project_yap.gox:72:1
		res := this.p.CodeFmt(todo, body, imports)
//line cmd/project_yap.gox:73:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": res})
	})
//line cmd/project_yap.gox:80:1
	this.Get("/asset/:id", func(ctx *yap.Context) {
//line cmd/project_yap.gox:81:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:82:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:83:1
		id := ctx.Param("id")
//line cmd/project_yap.gox:84:1
		asset, _ := this.p.Asset(todo, id)
//line cmd/project_yap.gox:85:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": map[string]*core.Asset{"asset": asset}})
	})
//line cmd/project_yap.gox:92:1
	this.Post("/asset/upload", func(ctx *yap.Context) {
//line cmd/project_yap.gox:93:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:94:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:95:1
		uid := ctx.FormValue("uid")
//line cmd/project_yap.gox:96:1
		name := ctx.FormValue("name")
//line cmd/project_yap.gox:97:1
		category := ctx.FormValue("category")
//line cmd/project_yap.gox:98:1
		isPublic := ctx.FormValue("isPublic")
//line cmd/project_yap.gox:99:1
		assetType := ctx.FormValue("assetType")
//line cmd/project_yap.gox:100:1
		ip, _ := strconv.Atoi(isPublic)
//line cmd/project_yap.gox:101:1
		file, header, _ := ctx.FormFile("file")
//line cmd/project_yap.gox:102:1
		asset := &core.Asset{Name: name, AuthorId: uid, Category: category, IsPublic: ip, AssetType: assetType, Status: 1}
//line cmd/project_yap.gox:110:1
		res, _ := this.p.UploadAsset(todo, asset, file, header)
//line cmd/project_yap.gox:111:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": map[string]string{"id": res.ID, "address": os.Getenv("QINIU_PATH") + res.Address}})
	})
//line cmd/project_yap.gox:117:1
	this.Post("/spirits/upload", func(ctx *yap.Context) {
//line cmd/project_yap.gox:118:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:119:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:120:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Methods", "*")
//line cmd/project_yap.gox:121:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Headers", "*")
//line cmd/project_yap.gox:122:1
		if ctx.Request.Method == "OPTIONS" {
//line cmd/project_yap.gox:123:1
			ctx.ResponseWriter.WriteHeader(200)
//line cmd/project_yap.gox:124:1
			return
		}
//line cmd/project_yap.gox:126:1
		ctx.ParseMultipartForm(10 << 20)
//line cmd/project_yap.gox:127:1
		userId := ""
//line cmd/project_yap.gox:128:1
		token := core.GetToken(ctx)
//line cmd/project_yap.gox:129:1
		user, err := this.p.GetUser(token)
//line cmd/project_yap.gox:130:1
		if err != nil {
//line cmd/project_yap.gox:131:1
			fmt.Printf("get user error:", err)
		} else {
//line cmd/project_yap.gox:133:1
			userId = user.Id
		}
//line cmd/project_yap.gox:136:1
		files := ctx.MultipartForm.File["files"]
//line cmd/project_yap.gox:137:1
		name := ctx.FormValue("name")
//line cmd/project_yap.gox:138:1
		path, err := this.p.UploadSpirits(todo, name, files, userId)
//line cmd/project_yap.gox:139:1
		if err != nil {
//line cmd/project_yap.gox:140:1
			ctx.Json__1(map[string]interface {
			}{"code": 400, "msg": "Failed to read request body"})
//line cmd/project_yap.gox:144:1
			return
		}
//line cmd/project_yap.gox:146:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": path})
	})
//line cmd/project_yap.gox:153:1
	this.Post("/asset/save", func(ctx *yap.Context) {
//line cmd/project_yap.gox:154:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:155:1
		id := ctx.FormValue("id")
//line cmd/project_yap.gox:156:1
		uid := ctx.FormValue("uid")
//line cmd/project_yap.gox:157:1
		name := ctx.FormValue("name")
//line cmd/project_yap.gox:158:1
		category := ctx.FormValue("category")
//line cmd/project_yap.gox:159:1
		isPublic := ctx.FormValue("isPublic")
//line cmd/project_yap.gox:160:1
		assetType := ctx.FormValue("assetType")
//line cmd/project_yap.gox:161:1
		ip, _ := strconv.Atoi(isPublic)
//line cmd/project_yap.gox:162:1
		file, header, _ := ctx.FormFile("file")
//line cmd/project_yap.gox:163:1
		asset := &core.Asset{ID: id, Name: name, AuthorId: uid, Category: category, IsPublic: ip, AssetType: assetType, Status: 1}
//line cmd/project_yap.gox:172:1
		_, _ = this.p.SaveAsset(todo, asset, file, header)
//line cmd/project_yap.gox:173:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": ""})
	})
//line cmd/project_yap.gox:180:1
	this.Get("/list/asset/:pageIndex/:pageSize/:assetType", func(ctx *yap.Context) {
//line cmd/project_yap.gox:181:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:182:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:183:1
		pageIndex := ctx.Param("pageIndex")
//line cmd/project_yap.gox:184:1
		pageSize := ctx.Param("pageSize")
//line cmd/project_yap.gox:185:1
		assetType := ctx.Param("assetType")
//line cmd/project_yap.gox:186:1
		category := ctx.Param("category")
//line cmd/project_yap.gox:187:1
		isOrderByTime := ctx.Param("isOrderByTime")
//line cmd/project_yap.gox:188:1
		isOrderByHot := ctx.Param("isOrderByHot")
//line cmd/project_yap.gox:189:1
		uid := ctx.Param("uid")
//line cmd/project_yap.gox:190:1
		result, _ := this.p.AssetList(todo, pageIndex, pageSize, assetType, category, isOrderByTime, isOrderByHot, uid)
//line cmd/project_yap.gox:191:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": result})
	})
//line cmd/project_yap.gox:199:1
	this.Get("/clickCount/asset/:id/:assetType", func(ctx *yap.Context) {
//line cmd/project_yap.gox:200:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:201:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:202:1
		id := ctx.Param("id")
//line cmd/project_yap.gox:203:1
		assetType := ctx.Param("assetType")
//line cmd/project_yap.gox:204:1
		this.p.IncrementAssetClickCount(todo, id, assetType)
//line cmd/project_yap.gox:205:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": ""})
	})
//line cmd/project_yap.gox:212:1
	this.Get("/list/pubProject/:pageIndex/:pageSize", func(ctx *yap.Context) {
//line cmd/project_yap.gox:213:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:214:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:215:1
		pageIndex := ctx.Param("pageIndex")
//line cmd/project_yap.gox:216:1
		pageSize := ctx.Param("pageSize")
//line cmd/project_yap.gox:217:1
		result, _ := this.p.PubProjectList(todo, pageIndex, pageSize)
//line cmd/project_yap.gox:218:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": result})
	})
//line cmd/project_yap.gox:224:1
	this.Get("/list/userProject/:uid/:pageIndex/:pageSize", func(ctx *yap.Context) {
//line cmd/project_yap.gox:225:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:226:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:227:1
		pageIndex := ctx.Param("pageIndex")
//line cmd/project_yap.gox:228:1
		pageSize := ctx.Param("pageSize")
//line cmd/project_yap.gox:229:1
		uid := ctx.Param("uid")
//line cmd/project_yap.gox:230:1
		result, _ := this.p.UserProjectList(todo, pageIndex, pageSize, uid)
//line cmd/project_yap.gox:231:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": result})
	})
//line cmd/project_yap.gox:237:1
	this.Post("/project/updateIsPublic", func(ctx *yap.Context) {
//line cmd/project_yap.gox:238:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:239:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:240:1
		id := ctx.FormValue("id")
//line cmd/project_yap.gox:241:1
		_ = this.p.UpdatePublic(todo, id)
//line cmd/project_yap.gox:242:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": ""})
	})
//line cmd/project_yap.gox:248:1
	this.Post("/asset/search", func(ctx *yap.Context) {
//line cmd/project_yap.gox:249:1
		ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
//line cmd/project_yap.gox:250:1
		ctx.ResponseWriter.Header().Set("Content-Type", "application/json")
//line cmd/project_yap.gox:251:1
		search := ctx.FormValue("search")
//line cmd/project_yap.gox:252:1
		assetType := ctx.FormValue("assetType")
//line cmd/project_yap.gox:253:1
		assets, _ := this.p.SearchAsset(todo, search, assetType)
//line cmd/project_yap.gox:254:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": assets})
	})
//line cmd/project_yap.gox:261:1
	conf := &core.Config{}
//line cmd/project_yap.gox:262:1
	this.p, _ = core.New(todo, conf)
//line cmd/project_yap.gox:263:1
	core.CasdoorConfigInit()
//line cmd/project_yap.gox:265:1
	this.Run(":8080")
}
func main() {
//line cmd/project_yap.gox:265:1
	yap.Gopt_App_Main(new(project))
}
