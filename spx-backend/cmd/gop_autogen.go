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
//line cmd/project_yap.gox:19:1
	this.Get("/project", func(ctx *yap.Context) {
//line cmd/project_yap.gox:20:1
		id := ctx.Param("id")
//line cmd/project_yap.gox:21:1
		res, err := this.p.FileInfo(todo, id)
//line cmd/project_yap.gox:22:1
		if err != nil {
//line cmd/project_yap.gox:23:1
			ctx.Json__1(map[string]interface {
			}{"code": 200, "msg": "not exist", "data": ""})
//line cmd/project_yap.gox:28:1
			return
		}
//line cmd/project_yap.gox:30:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "OK", "data": map[string]string{"id": res.ID, "address": os.Getenv("QINIU_PATH") + "/" + res.Address}})
	})
//line cmd/project_yap.gox:38:1
	this.Post("/project/allsave", func(ctx *yap.Context) {
//line cmd/project_yap.gox:39:1
		id := ctx.FormValue("id")
//line cmd/project_yap.gox:40:1
		userId := ""
//line cmd/project_yap.gox:41:1
		token := core.GetToken(ctx)
//line cmd/project_yap.gox:42:1
		if token == "" {
//line cmd/project_yap.gox:43:1
			ctx.Json__1(map[string]interface {
			}{"code": 200, "msg": "please login", "data": ""})
//line cmd/project_yap.gox:48:1
			return
		}
//line cmd/project_yap.gox:50:1
		user, err := this.p.GetUser(token)
//line cmd/project_yap.gox:51:1
		if err != nil {
//line cmd/project_yap.gox:52:1
			fmt.Printf("get user error:", err)
		} else {
//line cmd/project_yap.gox:54:1
			userId = user.Id
		}
//line cmd/project_yap.gox:56:1
		name := ctx.FormValue("name")
//line cmd/project_yap.gox:57:1
		file, header, _ := ctx.FormFile("file")
//line cmd/project_yap.gox:58:1
		codeFile := &core.CodeFile{ID: id, Name: name, AuthorId: userId}
//line cmd/project_yap.gox:63:1
		res, _ := this.p.SaveAllProject(todo, codeFile, file, header)
//line cmd/project_yap.gox:64:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": map[string]interface {
		}{"id": res.ID, "address": os.Getenv("QINIU_PATH") + "/" + res.Address, "version": res.Version}})
	})
//line cmd/project_yap.gox:72:1
	this.Post("/project/fmt", func(ctx *yap.Context) {
//line cmd/project_yap.gox:73:1
		body := ctx.FormValue("body")
//line cmd/project_yap.gox:74:1
		imports := ctx.FormValue("import")
//line cmd/project_yap.gox:75:1
		res := this.p.CodeFmt(todo, body, imports)
//line cmd/project_yap.gox:76:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": res})
	})
//line cmd/project_yap.gox:83:1
	this.Get("/asset/:id", func(ctx *yap.Context) {
//line cmd/project_yap.gox:85:1
		id := ctx.Param("id")
//line cmd/project_yap.gox:86:1
		asset, _ := this.p.Asset(todo, id)
//line cmd/project_yap.gox:87:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": map[string]*core.Asset{"asset": asset}})
	})
//line cmd/project_yap.gox:93:1
	this.Post("/spirits/upload", func(ctx *yap.Context) {
//line cmd/project_yap.gox:94:1
		ctx.ParseMultipartForm(10 << 20)
//line cmd/project_yap.gox:95:1
		userId := ""
//line cmd/project_yap.gox:96:1
		token := core.GetToken(ctx)
//line cmd/project_yap.gox:97:1
		if token == "" {
//line cmd/project_yap.gox:98:1
			ctx.Json__1(map[string]interface {
			}{"code": 200, "msg": "please login", "data": ""})
//line cmd/project_yap.gox:103:1
			return
		}
//line cmd/project_yap.gox:105:1
		user, err := this.p.GetUser(token)
//line cmd/project_yap.gox:106:1
		if err != nil {
//line cmd/project_yap.gox:107:1
			fmt.Printf("get user error:", err)
		} else {
//line cmd/project_yap.gox:109:1
			userId = user.Id
		}
//line cmd/project_yap.gox:112:1
		files := ctx.MultipartForm.File["files"]
//line cmd/project_yap.gox:113:1
		name := ctx.FormValue("name")
//line cmd/project_yap.gox:114:1
		flag := ctx.FormValue("flag")
//line cmd/project_yap.gox:115:1
		category := ctx.FormValue("category")
//line cmd/project_yap.gox:116:1
		path, err := this.p.UploadSpirits(todo, name, files, userId, flag, category)
//line cmd/project_yap.gox:117:1
		if err != nil {
//line cmd/project_yap.gox:118:1
			ctx.Json__1(map[string]interface {
			}{"code": 400, "msg": "Failed to read request body"})
//line cmd/project_yap.gox:122:1
			return
		}
//line cmd/project_yap.gox:124:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": path})
	})
//line cmd/project_yap.gox:131:1
	this.Post("/asset/save", func(ctx *yap.Context) {
//line cmd/project_yap.gox:132:1
		id := ctx.FormValue("id")
//line cmd/project_yap.gox:133:1
		userId := ""
//line cmd/project_yap.gox:134:1
		token := core.GetToken(ctx)
//line cmd/project_yap.gox:135:1
		if token == "" {
//line cmd/project_yap.gox:136:1
			ctx.Json__1(map[string]interface {
			}{"code": 200, "msg": "please login", "data": ""})
//line cmd/project_yap.gox:141:1
			return
		}
//line cmd/project_yap.gox:143:1
		user, err := this.p.GetUser(token)
//line cmd/project_yap.gox:144:1
		if err != nil {
//line cmd/project_yap.gox:145:1
			fmt.Printf("get user error:", err)
		} else {
//line cmd/project_yap.gox:147:1
			userId = user.Id
		}
//line cmd/project_yap.gox:149:1
		name := ctx.FormValue("name")
//line cmd/project_yap.gox:150:1
		category := ctx.FormValue("category")
//line cmd/project_yap.gox:151:1
		isPublic := ctx.FormValue("isPublic")
//line cmd/project_yap.gox:152:1
		assetType := ctx.FormValue("assetType")
//line cmd/project_yap.gox:153:1
		ip, _ := strconv.Atoi(isPublic)
//line cmd/project_yap.gox:154:1
		file, header, _ := ctx.FormFile("file")
//line cmd/project_yap.gox:155:1
		asset := &core.Asset{ID: id, Name: name, AuthorId: userId, Category: category, IsPublic: ip, AssetType: assetType, Status: 1}
//line cmd/project_yap.gox:164:1
		_, _ = this.p.SaveAsset(todo, asset, file, header)
//line cmd/project_yap.gox:165:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": ""})
	})
//line cmd/project_yap.gox:172:1
	this.Get("/list/asset", func(ctx *yap.Context) {
//line cmd/project_yap.gox:173:1
		pageIndex := ctx.Param("pageIndex")
//line cmd/project_yap.gox:174:1
		pageSize := ctx.Param("pageSize")
//line cmd/project_yap.gox:175:1
		assetType := ctx.Param("assetType")
//line cmd/project_yap.gox:176:1
		category := ctx.Param("category")
//line cmd/project_yap.gox:177:1
		isOrderByTime := ctx.Param("isOrderByTime")
//line cmd/project_yap.gox:178:1
		isOrderByHot := ctx.Param("isOrderByHot")
//line cmd/project_yap.gox:179:1
		result, _ := this.p.AssetPubList(todo, pageIndex, pageSize, assetType, category, isOrderByTime, isOrderByHot)
//line cmd/project_yap.gox:180:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": result})
	})
//line cmd/project_yap.gox:187:1
	this.Get("/list/userasset", func(ctx *yap.Context) {
//line cmd/project_yap.gox:188:1
		userId := ""
//line cmd/project_yap.gox:189:1
		token := core.GetToken(ctx)
//line cmd/project_yap.gox:190:1
		if token == "" {
//line cmd/project_yap.gox:191:1
			ctx.Json__1(map[string]interface {
			}{"code": 200, "msg": "please login", "data": ""})
//line cmd/project_yap.gox:196:1
			return
		}
//line cmd/project_yap.gox:198:1
		user, err := this.p.GetUser(token)
//line cmd/project_yap.gox:199:1
		if err != nil {
//line cmd/project_yap.gox:200:1
			fmt.Printf("get user error:", err)
		} else {
//line cmd/project_yap.gox:202:1
			userId = user.Id
		}
//line cmd/project_yap.gox:204:1
		pageIndex := ctx.Param("pageIndex")
//line cmd/project_yap.gox:205:1
		pageSize := ctx.Param("pageSize")
//line cmd/project_yap.gox:206:1
		assetType := ctx.Param("assetType")
//line cmd/project_yap.gox:207:1
		category := ctx.Param("category")
//line cmd/project_yap.gox:208:1
		isOrderByTime := ctx.Param("isOrderByTime")
//line cmd/project_yap.gox:209:1
		isOrderByHot := ctx.Param("isOrderByHot")
//line cmd/project_yap.gox:210:1
		result, _ := this.p.UserAssetList(todo, pageIndex, pageSize, assetType, category, isOrderByTime, isOrderByHot, userId)
//line cmd/project_yap.gox:211:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": result})
	})
//line cmd/project_yap.gox:219:1
	this.Get("/clickCount/asset/:id/:assetType", func(ctx *yap.Context) {
//line cmd/project_yap.gox:220:1
		id := ctx.Param("id")
//line cmd/project_yap.gox:221:1
		assetType := ctx.Param("assetType")
//line cmd/project_yap.gox:222:1
		this.p.IncrementAssetClickCount(todo, id, assetType)
//line cmd/project_yap.gox:223:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": ""})
	})
//line cmd/project_yap.gox:230:1
	this.Get("/list/pubProject/:pageIndex/:pageSize", func(ctx *yap.Context) {
//line cmd/project_yap.gox:231:1
		pageIndex := ctx.Param("pageIndex")
//line cmd/project_yap.gox:232:1
		pageSize := ctx.Param("pageSize")
//line cmd/project_yap.gox:233:1
		result, _ := this.p.PubProjectList(todo, pageIndex, pageSize)
//line cmd/project_yap.gox:234:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": result})
	})
//line cmd/project_yap.gox:240:1
	this.Get("/list/userProject/:pageIndex/:pageSize", func(ctx *yap.Context) {
//line cmd/project_yap.gox:241:1
		userId := ""
//line cmd/project_yap.gox:242:1
		token := core.GetToken(ctx)
//line cmd/project_yap.gox:243:1
		if token == "" {
//line cmd/project_yap.gox:244:1
			ctx.Json__1(map[string]interface {
			}{"code": 200, "msg": "please login", "data": ""})
//line cmd/project_yap.gox:249:1
			return
		}
//line cmd/project_yap.gox:251:1
		user, err := this.p.GetUser(token)
//line cmd/project_yap.gox:252:1
		if err != nil {
//line cmd/project_yap.gox:253:1
			fmt.Printf("get user error:", err)
		} else {
//line cmd/project_yap.gox:255:1
			userId = user.Id
		}
//line cmd/project_yap.gox:257:1
		pageIndex := ctx.Param("pageIndex")
//line cmd/project_yap.gox:258:1
		pageSize := ctx.Param("pageSize")
//line cmd/project_yap.gox:259:1
		result, _ := this.p.UserProjectList(todo, pageIndex, pageSize, userId)
//line cmd/project_yap.gox:260:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": result})
	})
//line cmd/project_yap.gox:266:1
	this.Post("/project/updateIsPublic", func(ctx *yap.Context) {
//line cmd/project_yap.gox:268:1
		id := ctx.FormValue("id")
//line cmd/project_yap.gox:269:1
		_ = this.p.UpdatePublic(todo, id)
//line cmd/project_yap.gox:270:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": ""})
	})
//line cmd/project_yap.gox:276:1
	this.Post("/asset/search", func(ctx *yap.Context) {
//line cmd/project_yap.gox:277:1
		search := ctx.FormValue("search")
//line cmd/project_yap.gox:278:1
		assetType := ctx.FormValue("assetType")
//line cmd/project_yap.gox:279:1
		assets, _ := this.p.SearchAsset(todo, search, assetType)
//line cmd/project_yap.gox:280:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": assets})
	})
//line cmd/project_yap.gox:287:1
	conf := &core.Config{}
//line cmd/project_yap.gox:288:1
	this.p, _ = core.New(todo, conf)
//line cmd/project_yap.gox:289:1
	core.CasdoorConfigInit()
//line cmd/project_yap.gox:291:1
	this.Run(":8080", common.CorsMiddleware)
}
func main() {
//line cmd/project_yap.gox:291:1
	yap.Gopt_App_Main(new(project))
}
