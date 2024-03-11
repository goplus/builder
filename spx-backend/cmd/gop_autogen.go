package main

import (
	"context"
	"github.com/goplus/builder/spx-backend/internal/common"
	"github.com/goplus/builder/spx-backend/internal/core"
	"github.com/goplus/yap"
	"os"
	"strconv"
)

const _ = true

type project struct {
	yap.App
	ctrl *core.Controller
}
//line cmd/project_yap.gox:16
func (this *project) MainEntry() {
//line cmd/project_yap.gox:16:1
	todo := context.TODO()
//line cmd/project_yap.gox:19:1
	this.Post("/project", func(ctx *yap.Context) {
//line cmd/project_yap.gox:20:1
		id := ctx.FormValue("id")
//line cmd/project_yap.gox:21:1
		currentUid := core.ParseToken(this.ctrl, ctx)
//line cmd/project_yap.gox:22:1
		if currentUid == "" {
//line cmd/project_yap.gox:23:1
			code := common.NoLogin
//line cmd/project_yap.gox:24:1
			ctx.Json__1(map[string]interface {
			}{"code": code, "msg": common.GetMsg(code), "data": ""})
//line cmd/project_yap.gox:29:1
			return
		}
//line cmd/project_yap.gox:31:1
		name := ctx.FormValue("name")
//line cmd/project_yap.gox:32:1
		if name == "" {
//line cmd/project_yap.gox:33:1
			code := common.ErrorNameNotNull
//line cmd/project_yap.gox:34:1
			ctx.Json__1(map[string]interface {
			}{"code": code, "msg": common.GetMsg(code), "data": ""})
//line cmd/project_yap.gox:39:1
			return
		}
//line cmd/project_yap.gox:41:1
		file, header, _ := ctx.FormFile("file")
//line cmd/project_yap.gox:42:1
		project := &core.Project{ID: id, Name: name, AuthorId: currentUid}
//line cmd/project_yap.gox:47:1
		res, err := this.ctrl.SaveProject(todo, project, file, header)
//line cmd/project_yap.gox:48:1
		if err != nil {
//line cmd/project_yap.gox:49:1
			code := common.ErrorSave
//line cmd/project_yap.gox:50:1
			ctx.Json__1(map[string]interface {
			}{"code": code, "msg": common.GetMsg(code), "data": ""})
//line cmd/project_yap.gox:55:1
			return
		}
//line cmd/project_yap.gox:57:1
		code := common.SUCCESS
//line cmd/project_yap.gox:58:1
		ctx.Json__1(map[string]interface {
		}{"code": code, "msg": common.GetMsg(code), "data": res})
	})
//line cmd/project_yap.gox:66:1
	this.Get("/project/:id", func(ctx *yap.Context) {
//line cmd/project_yap.gox:67:1
		id := ctx.Param("id")
//line cmd/project_yap.gox:68:1
		currentUid := core.ParseToken(this.ctrl, ctx)
//line cmd/project_yap.gox:69:1
		res, err := this.ctrl.ProjectInfo(todo, id, currentUid)
//line cmd/project_yap.gox:70:1
		if err != nil {
//line cmd/project_yap.gox:71:1
			if err == os.ErrNotExist {
//line cmd/project_yap.gox:72:1
				code := common.ErrorProjectNotFound
//line cmd/project_yap.gox:73:1
				ctx.Json__1(map[string]interface {
				}{"code": code, "msg": common.GetMsg(code), "data": ""})
			} else {
//line cmd/project_yap.gox:80:1
				code := common.ErrorPermissions
//line cmd/project_yap.gox:81:1
				ctx.Json__1(map[string]interface {
				}{"code": code, "msg": common.GetMsg(code), "data": ""})
			}
//line cmd/project_yap.gox:88:1
			return
		}
//line cmd/project_yap.gox:90:1
		code := common.SUCCESS
//line cmd/project_yap.gox:91:1
		ctx.Json__1(map[string]interface {
		}{"code": code, "msg": common.GetMsg(code), "data": res})
	})
//line cmd/project_yap.gox:99:1
	this.Delete("/project/:id", func(ctx *yap.Context) {
//line cmd/project_yap.gox:100:1
		id := ctx.Param("id")
//line cmd/project_yap.gox:101:1
		currentUid := core.ParseToken(this.ctrl, ctx)
//line cmd/project_yap.gox:102:1
		if currentUid == "" {
//line cmd/project_yap.gox:103:1
			code := common.NoLogin
//line cmd/project_yap.gox:104:1
			ctx.Json__1(map[string]interface {
			}{"code": code, "msg": common.GetMsg(code), "data": ""})
//line cmd/project_yap.gox:109:1
			return
		}
//line cmd/project_yap.gox:111:1
		err := this.ctrl.DeleteProject(todo, id, currentUid)
//line cmd/project_yap.gox:112:1
		if err != nil {
//line cmd/project_yap.gox:113:1
			if err == common.ErrPermissions {
//line cmd/project_yap.gox:114:1
				code := common.ErrorPermissions
//line cmd/project_yap.gox:115:1
				ctx.Json__1(map[string]interface {
				}{"code": code, "msg": common.GetMsg(code), "data": ""})
//line cmd/project_yap.gox:120:1
				return
			}
//line cmd/project_yap.gox:122:1
			code := common.ErrorDeleteProject
//line cmd/project_yap.gox:123:1
			ctx.Json__1(map[string]interface {
			}{"code": code, "msg": common.GetMsg(code), "data": ""})
//line cmd/project_yap.gox:128:1
			return
		}
//line cmd/project_yap.gox:130:1
		code := common.SUCCESS
//line cmd/project_yap.gox:131:1
		ctx.Json__1(map[string]interface {
		}{"code": code, "msg": common.GetMsg(code), "data": ""})
	})
//line cmd/project_yap.gox:139:1
	this.Put("/project/:id/is-public", func(ctx *yap.Context) {
//line cmd/project_yap.gox:140:1
		currentUid := core.ParseToken(this.ctrl, ctx)
//line cmd/project_yap.gox:141:1
		if currentUid == "" {
//line cmd/project_yap.gox:142:1
			code := common.NoLogin
//line cmd/project_yap.gox:143:1
			ctx.Json__1(map[string]interface {
			}{"code": code, "msg": common.GetMsg(code), "data": ""})
//line cmd/project_yap.gox:148:1
			return
		}
//line cmd/project_yap.gox:150:1
		id := ctx.Param("id")
//line cmd/project_yap.gox:151:1
		isPublic := ctx.Param("isPublic")
//line cmd/project_yap.gox:152:1
		err := this.ctrl.UpdatePublic(todo, id, isPublic, currentUid)
//line cmd/project_yap.gox:153:1
		if err != nil {
//line cmd/project_yap.gox:154:1
			if err == common.ErrPermissions {
//line cmd/project_yap.gox:155:1
				code := common.ErrorPermissions
//line cmd/project_yap.gox:156:1
				ctx.Json__1(map[string]interface {
				}{"code": code, "msg": common.GetMsg(code), "data": ""})
//line cmd/project_yap.gox:161:1
				return
			}
//line cmd/project_yap.gox:163:1
			code := common.ErrorUpdateProjectState
//line cmd/project_yap.gox:164:1
			ctx.Json__1(map[string]interface {
			}{"code": code, "msg": common.GetMsg(code), "data": ""})
//line cmd/project_yap.gox:169:1
			return
		}
//line cmd/project_yap.gox:171:1
		code := common.SUCCESS
//line cmd/project_yap.gox:172:1
		ctx.Json__1(map[string]interface {
		}{"code": code, "msg": common.GetMsg(code), "data": ""})
	})
//line cmd/project_yap.gox:180:1
	this.Get("/projects/list", func(ctx *yap.Context) {
//line cmd/project_yap.gox:181:1
		currentUid := core.ParseToken(this.ctrl, ctx)
//line cmd/project_yap.gox:182:1
		isPublic := ctx.Param("isPublic")
//line cmd/project_yap.gox:183:1
		if isPublic == strconv.Itoa(common.PERSONAL) && currentUid == "" {
//line cmd/project_yap.gox:184:1
			code := common.NoLogin
//line cmd/project_yap.gox:185:1
			ctx.Json__1(map[string]interface {
			}{"code": code, "msg": common.GetMsg(code), "data": ""})
//line cmd/project_yap.gox:190:1
			return
		}
//line cmd/project_yap.gox:192:1
		pageIndex := ctx.Param("pageIndex")
//line cmd/project_yap.gox:193:1
		pageSize := ctx.Param("pageSize")
//line cmd/project_yap.gox:194:1
		author := ctx.Param("author")
//line cmd/project_yap.gox:195:1
		authorId := ""
//line cmd/project_yap.gox:196:1
		if author == "" {
//line cmd/project_yap.gox:197:1
			authorId = currentUid
		} else
//line cmd/project_yap.gox:198:1
		if author == "*" {
//line cmd/project_yap.gox:199:1
			authorId = ""
		} else {
//line cmd/project_yap.gox:201:1
			authorId = author
		}
//line cmd/project_yap.gox:203:1
		if authorId != currentUid {
//line cmd/project_yap.gox:204:1
			isPublic = strconv.Itoa(common.PUBLIC)
		}
//line cmd/project_yap.gox:206:1
		result, err := this.ctrl.ProjectList(todo, pageIndex, pageSize, isPublic, authorId)
//line cmd/project_yap.gox:207:1
		if err != nil {
//line cmd/project_yap.gox:208:1
			code := common.ErrorGetProjects
//line cmd/project_yap.gox:209:1
			ctx.Json__1(map[string]interface {
			}{"code": code, "msg": common.GetMsg(code), "data": ""})
//line cmd/project_yap.gox:214:1
			return
		}
//line cmd/project_yap.gox:216:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": result})
	})
//line cmd/project_yap.gox:224:1
	this.Post("/asset", func(ctx *yap.Context) {
//line cmd/project_yap.gox:225:1
		err := ctx.ParseMultipartForm(10 << 20)
//line cmd/project_yap.gox:226:1
		if err != nil {
//line cmd/project_yap.gox:227:1
			code := common.ErrorParseMultipartForm
//line cmd/project_yap.gox:228:1
			ctx.Json__1(map[string]interface {
			}{"code": code, "msg": common.GetMsg(code), "data": ""})
//line cmd/project_yap.gox:233:1
			return
		}
//line cmd/project_yap.gox:235:1
		currentUid := core.ParseToken(this.ctrl, ctx)
//line cmd/project_yap.gox:236:1
		if currentUid == "" {
//line cmd/project_yap.gox:237:1
			code := common.NoLogin
//line cmd/project_yap.gox:238:1
			ctx.Json__1(map[string]interface {
			}{"code": code, "msg": common.GetMsg(code), "data": ""})
//line cmd/project_yap.gox:243:1
			return
		}
//line cmd/project_yap.gox:245:1
		files := ctx.MultipartForm.File["files"]
//line cmd/project_yap.gox:246:1
		name := ctx.FormValue("name")
//line cmd/project_yap.gox:247:1
		publishState := ctx.FormValue("publishState")
//line cmd/project_yap.gox:248:1
		previewAddress := ctx.FormValue("previewAddress")
//line cmd/project_yap.gox:249:1
		category := ctx.FormValue("category")
//line cmd/project_yap.gox:250:1
		assetType := ctx.FormValue("assetType")
//line cmd/project_yap.gox:251:1
		err = this.ctrl.UploadAsset(todo, name, files, previewAddress, currentUid, category, publishState, assetType)
//line cmd/project_yap.gox:252:1
		if err != nil {
//line cmd/project_yap.gox:253:1
			code := common.ErrorUpload
//line cmd/project_yap.gox:254:1
			ctx.Json__1(map[string]interface {
			}{"code": code, "msg": common.GetMsg(code), "data": ""})
//line cmd/project_yap.gox:259:1
			return
		}
//line cmd/project_yap.gox:261:1
		code := common.SUCCESS
//line cmd/project_yap.gox:262:1
		ctx.Json__1(map[string]interface {
		}{"code": code, "msg": common.GetMsg(code), "data": ""})
	})
//line cmd/project_yap.gox:270:1
	this.Get("/asset/:id", func(ctx *yap.Context) {
//line cmd/project_yap.gox:271:1
		currentUid := core.ParseToken(this.ctrl, ctx)
//line cmd/project_yap.gox:272:1
		id := ctx.Param("id")
//line cmd/project_yap.gox:273:1
		asset, err := this.ctrl.Asset(todo, id, currentUid)
//line cmd/project_yap.gox:274:1
		if err != nil {
//line cmd/project_yap.gox:275:1
			if err == os.ErrNotExist {
//line cmd/project_yap.gox:276:1
				code := common.ErrorProjectNotFound
//line cmd/project_yap.gox:277:1
				ctx.Json__1(map[string]interface {
				}{"code": code, "msg": common.GetMsg(code), "data": ""})
//line cmd/project_yap.gox:282:1
				return
			}
//line cmd/project_yap.gox:284:1
			code := common.ErrorGetAsset
//line cmd/project_yap.gox:285:1
			ctx.Json__1(map[string]interface {
			}{"code": code, "msg": common.GetMsg(code), "data": ""})
//line cmd/project_yap.gox:290:1
			return
		}
//line cmd/project_yap.gox:292:1
		code := common.SUCCESS
//line cmd/project_yap.gox:293:1
		ctx.Json__1(map[string]interface {
		}{"code": code, "msg": common.GetMsg(code), "data": asset})
	})
//line cmd/project_yap.gox:301:1
	this.Get("/assets/list", func(ctx *yap.Context) {
//line cmd/project_yap.gox:302:1
		currentUid := core.ParseToken(this.ctrl, ctx)
//line cmd/project_yap.gox:303:1
		isPublic := ctx.Param("isPublic")
//line cmd/project_yap.gox:304:1
		if isPublic == strconv.Itoa(common.PERSONAL) && currentUid == "" {
//line cmd/project_yap.gox:305:1
			code := common.NoLogin
//line cmd/project_yap.gox:306:1
			ctx.Json__1(map[string]interface {
			}{"code": code, "msg": common.GetMsg(code), "data": ""})
//line cmd/project_yap.gox:311:1
			return
		}
//line cmd/project_yap.gox:313:1
		author := ctx.Param("author")
//line cmd/project_yap.gox:315:1
		pageIndex := ctx.Param("pageIndex")
//line cmd/project_yap.gox:316:1
		pageSize := ctx.Param("pageSize")
//line cmd/project_yap.gox:317:1
		assetType := ctx.Param("assetType")
//line cmd/project_yap.gox:318:1
		category := ctx.Param("category")
//line cmd/project_yap.gox:319:1
		isOrderByTime := ctx.Param("isOrderByTime")
//line cmd/project_yap.gox:320:1
		isOrderByHot := ctx.Param("isOrderByHot")
//line cmd/project_yap.gox:321:1
		authorId := ""
//line cmd/project_yap.gox:322:1
		if author == "" {
//line cmd/project_yap.gox:323:1
			authorId = currentUid
		} else
//line cmd/project_yap.gox:324:1
		if author == "*" {
//line cmd/project_yap.gox:325:1
			authorId = ""
		} else {
//line cmd/project_yap.gox:327:1
			authorId = author
		}
//line cmd/project_yap.gox:329:1
		if authorId != currentUid {
//line cmd/project_yap.gox:330:1
			isPublic = strconv.Itoa(common.PUBLIC)
		}
//line cmd/project_yap.gox:332:1
		result, err := this.ctrl.AssetList(todo, pageIndex, pageSize, assetType, category, isOrderByTime, isOrderByHot, authorId, isPublic)
//line cmd/project_yap.gox:333:1
		if err != nil {
//line cmd/project_yap.gox:334:1
			code := common.ErrorGetAsset
//line cmd/project_yap.gox:335:1
			ctx.Json__1(map[string]interface {
			}{"code": code, "msg": common.GetMsg(code), "data": ""})
//line cmd/project_yap.gox:340:1
			return
		}
//line cmd/project_yap.gox:342:1
		code := common.SUCCESS
//line cmd/project_yap.gox:343:1
		ctx.Json__1(map[string]interface {
		}{"code": code, "msg": common.GetMsg(code), "data": result})
	})
//line cmd/project_yap.gox:351:1
	this.Post("/asset/:id/click-count", func(ctx *yap.Context) {
//line cmd/project_yap.gox:352:1
		id := ctx.Param("id")
//line cmd/project_yap.gox:353:1
		err := this.ctrl.IncrementAssetClickCount(todo, id)
//line cmd/project_yap.gox:354:1
		if err != nil {
//line cmd/project_yap.gox:355:1
			code := common.ErrClick
//line cmd/project_yap.gox:356:1
			ctx.Json__1(map[string]interface {
			}{"code": code, "msg": common.GetMsg(code), "data": ""})
//line cmd/project_yap.gox:361:1
			return
		}
//line cmd/project_yap.gox:363:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": ""})
	})
//line cmd/project_yap.gox:371:1
	this.Get("/assets/search", func(ctx *yap.Context) {
//line cmd/project_yap.gox:372:1
		currentUid := core.ParseToken(this.ctrl, ctx)
//line cmd/project_yap.gox:373:1
		search := ctx.Param("search")
//line cmd/project_yap.gox:374:1
		assetType := ctx.Param("assetType")
//line cmd/project_yap.gox:375:1
		pageIndex := ctx.Param("pageIndex")
//line cmd/project_yap.gox:376:1
		pageSize := ctx.Param("pageSize")
//line cmd/project_yap.gox:377:1
		assets, err := this.ctrl.SearchAsset(todo, search, pageIndex, pageSize, assetType, currentUid)
//line cmd/project_yap.gox:378:1
		if err != nil {
//line cmd/project_yap.gox:379:1
			code := common.ErrorGetAsset
//line cmd/project_yap.gox:380:1
			ctx.Json__1(map[string]interface {
			}{"code": code, "msg": common.GetMsg(code), "data": ""})
//line cmd/project_yap.gox:385:1
			return
		}
//line cmd/project_yap.gox:387:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": assets})
	})
//line cmd/project_yap.gox:395:1
	this.Post("/util/fmt", func(ctx *yap.Context) {
//line cmd/project_yap.gox:396:1
		body := ctx.FormValue("body")
//line cmd/project_yap.gox:397:1
		imports := ctx.FormValue("import")
//line cmd/project_yap.gox:398:1
		res := this.ctrl.CodeFmt(todo, body, imports)
//line cmd/project_yap.gox:399:1
		ctx.Json__1(map[string]interface {
		}{"code": 200, "msg": "ok", "data": res})
	})
//line cmd/project_yap.gox:407:1
	this.Post("/util/to-gif", func(ctx *yap.Context) {
//line cmd/project_yap.gox:408:1
		err := ctx.ParseMultipartForm(10 << 20)
//line cmd/project_yap.gox:409:1
		if err != nil {
//line cmd/project_yap.gox:410:1
			code := common.ErrorParseMultipartForm
//line cmd/project_yap.gox:411:1
			ctx.Json__1(map[string]interface {
			}{"code": code, "msg": common.GetMsg(code), "data": ""})
//line cmd/project_yap.gox:416:1
			return
		}
//line cmd/project_yap.gox:418:1
		files := ctx.MultipartForm.File["files"]
//line cmd/project_yap.gox:419:1
		path, err := this.ctrl.ImagesToGif(todo, files)
//line cmd/project_yap.gox:420:1
		if err != nil {
//line cmd/project_yap.gox:421:1
			code := common.ErrorImagesToGif
//line cmd/project_yap.gox:422:1
			ctx.Json__1(map[string]interface {
			}{"code": code, "msg": common.GetMsg(code), "data": ""})
//line cmd/project_yap.gox:427:1
			return
		}
//line cmd/project_yap.gox:429:1
		code := common.SUCCESS
//line cmd/project_yap.gox:430:1
		ctx.Json__1(map[string]interface {
		}{"code": code, "msg": common.GetMsg(code), "data": path})
	})
//line cmd/project_yap.gox:437:1
	conf := &core.Config{}
//line cmd/project_yap.gox:438:1
	this.ctrl, _ = core.New(todo, conf)
//line cmd/project_yap.gox:439:1
	core.CasdoorConfigInit()
//line cmd/project_yap.gox:441:1
	this.Run(":8080", common.CorsMiddleware)
}
func main() {
//line cmd/project_yap.gox:441:1
	yap.Gopt_App_Main(new(project))
}
