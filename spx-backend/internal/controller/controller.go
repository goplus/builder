package controller

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"

	"image"
	"image/gif"
	_ "image/png"
	"mime/multipart"
	"os"
	"strconv"
	"time"

	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/builder/spx-backend/internal/storage"
	"github.com/goplus/builder/spx-backend/internal/utils"
	"github.com/goplus/builder/spx-backend/internal/utils/fmtcode"
	"github.com/goplus/builder/spx-backend/internal/utils/log"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
	_ "github.com/qiniu/go-cdk-driver/kodoblob"
	"gocloud.dev/blob"
)

var (
	ErrNotExist        = os.ErrNotExist
	ErrPermissions     = errors.New("not Permissions")
	ErrProjectNotExist = errors.New("no project")
)

type Config struct {
	Driver string // database driver. default is `mysql`.
	DSN    string // database data source name
	BlobUS string // blob URL scheme
}

type Controller struct {
	bucket storage.Bucket
	db     *sql.DB
}

// New init Config
func New(ctx context.Context, conf *Config) (ret *Controller, err error) {
	logger := log.GetLogger()
	err = godotenv.Load()
	if err != nil {
		logger.Printf("failed to read env : %v", err)
		return
	}
	if conf == nil {
		conf = new(Config)
	}
	driver := conf.Driver
	dsn := conf.DSN
	bus := conf.BlobUS
	if driver == "" {
		driver = "mysql"
	}
	if dsn == "" {
		dsn = os.Getenv("GOP_SPX_DSN")
	}
	if bus == "" {
		bus = os.Getenv("GOP_SPX_BLOBUS")
	}

	bucket, err := blob.OpenBucket(ctx, bus)
	if err != nil {
		logger.Printf("failed to connect kodo : %v", err)
		return
	}
	blobBucket := storage.NewBlobBucket(bucket)
	db, err := sql.Open(driver, dsn)
	if err != nil {
		logger.Printf("failed to connect sql : %v", err)
		return
	}
	return &Controller{blobBucket, db}, nil
}

// ProjectInfo Find project from db
func (ctrl *Controller) ProjectInfo(ctx context.Context, id string, currentUid string) (*model.Project, error) {
	logger := log.GetReqLogger(ctx)
	pro, err := model.QueryById[model.Project](ctrl.db, id)
	if err != nil {
		logger.Printf("failed to query project id= %v : %v", id, err)
		return nil, err
	}
	if pro == nil {
		return nil, ErrNotExist
	}
	pro.Address = os.Getenv("QINIU_PATH") + "/" + pro.Address
	if pro.IsPublic == model.PUBLIC || currentUid == pro.AuthorId {
		return pro, nil
	}

	return nil, ErrPermissions
}

// DeleteProject Delete Project
func (ctrl *Controller) DeleteProject(ctx context.Context, id string, currentUid string) error {
	logger := log.GetReqLogger(ctx)
	project, err := model.QueryById[model.Project](ctrl.db, id)
	if err != nil {
		logger.Printf("failed to query project id= %v : %v", id, err)
		return err
	}
	if project.AuthorId != currentUid {
		return ErrPermissions
	}
	return model.DeleteProjectById(ctrl.db, id)

}

// SaveProject Save project
func (ctrl *Controller) SaveProject(ctx context.Context, project *model.Project, file multipart.File, header *multipart.FileHeader) (*model.Project, error) {
	logger := log.GetReqLogger(ctx)
	if project.ID == "" {
		path, err := storage.UploadFile(ctx, ctrl.bucket, os.Getenv("PROJECT_PATH"), file, header.Filename)
		if err != nil {
			logger.Printf("failed to UploadFile %v : %v", header.Filename, err)
			return nil, err
		}
		project.Address = path
		project.Version = 1
		project.Status = 1
		project.IsPublic = model.PERSONAL
		project.Ctime = time.Now()
		project.Utime = time.Now()
		project.ID, err = model.AddProject(ctrl.db, project)
		project.Address = os.Getenv("QINIU_PATH") + "/" + path
		return project, err
	} else {

		p, err := model.QueryById[model.Project](ctrl.db, project.ID)
		if err != nil {
			logger.Printf("failed to query project id= %v : %v", project.ID, err)
			return nil, err
		}
		if p.Address == "" {
			return nil, ErrProjectNotExist
		}
		err = ctrl.bucket.Delete(ctx, p.Address)
		if err != nil {
			logger.Printf("failed to delete kodo File %v : %v", p.Address, err)
			return nil, err
		}
		path, err := storage.UploadFile(ctx, ctrl.bucket, os.Getenv("PROJECT_PATH"), file, header.Filename)
		if err != nil {
			logger.Printf("failed to UploadFile %v : %v", header.Filename, err)
			return nil, err
		}
		p.Address = path
		p.Version = p.Version + 1
		p.Name = project.Name
		err = model.UpdateProject(ctrl.db, p)
		p.Address = os.Getenv("QINIU_PATH") + "/" + path
		return p, err
	}
}

// CodeFmt Format code
func (ctrl *Controller) CodeFmt(ctx context.Context, body, fiximport string) (res *fmtcode.FormatResponse) {
	return fmtcode.FmtCode(body, fiximport)
}

// Asset returns an Asset.
func (ctrl *Controller) Asset(ctx context.Context, id string, currentUid string) (*model.Asset, error) {
	logger := log.GetReqLogger(ctx)
	asset, err := model.QueryById[model.Asset](ctrl.db, id)
	if err != nil {
		logger.Printf("failed to query assets : %v", err)
		return nil, err
	}
	if asset == nil {
		return nil, ErrNotExist
	}
	modifiedAddress, err := ctrl.ModifyAssetAddress(ctx, asset.Address)
	if err != nil {
		logger.Printf("failed to ModifyAssetAddress %v : %v", asset.Address, err)
		return nil, err
	}
	asset.Address = modifiedAddress

	if asset.IsPublic == model.PUBLIC || currentUid == asset.AuthorId {
		return asset, nil
	}

	return nil, ErrPermissions
}

// AssetList list  assets
func (ctrl *Controller) AssetList(ctx context.Context, pageIndex string, pageSize string, assetType string, category string, isOrderByTime string, isOrderByHot string, authorId string, isPublic string) (*model.Pagination[model.Asset], error) {
	logger := log.GetReqLogger(ctx)
	wheres := []model.FilterCondition{
		{Column: "asset_type", Operation: "=", Value: assetType},
	}
	if authorId != "" {
		wheres = append(wheres, model.FilterCondition{Column: "author_id", Operation: "=", Value: authorId})
	}
	if isPublic != "" {
		wheres = append(wheres, model.FilterCondition{Column: "is_public", Operation: "=", Value: isPublic})
	}
	var orders []model.OrderByCondition
	if category != "" {
		wheres = append(wheres, model.FilterCondition{Column: "category", Operation: "=", Value: category})
	}
	if isOrderByTime != "" {
		orders = append(orders, model.OrderByCondition{Column: "c_time", Direction: "desc"})
	}
	if isOrderByHot != "" {
		orders = append(orders, model.OrderByCondition{Column: "click_count", Direction: "desc"})
	}
	pagination, err := model.QueryByPage[model.Asset](ctrl.db, pageIndex, pageSize, wheres, orders)
	if err != nil {
		logger.Printf("failed to query assets : %v", err)
		return nil, err
	}
	for i, asset := range pagination.Data {
		modifiedAddress, err := ctrl.ModifyAssetAddress(ctx, asset.Address)
		if err != nil {
			logger.Printf("failed to ModifyAssetAddress %v : %v", asset.Address, err)
			return nil, err
		}
		pagination.Data[i].Address = modifiedAddress
	}
	return pagination, nil
}

// IncrementAssetClickCount increments the click count for an asset.
func (ctrl *Controller) IncrementAssetClickCount(ctx context.Context, id string) error {
	logger := log.GetReqLogger(ctx)
	query := "UPDATE asset SET click_count = click_count + 1 WHERE id = ?"
	_, err := ctrl.db.ExecContext(ctx, query, id)
	if err != nil {
		logger.Printf("failed to Incre Asset Click Count : %v", err)
		return err
	}
	return nil
}

// ModifyAssetAddress transfers relative path to download url
func (ctrl *Controller) ModifyAssetAddress(ctx context.Context, address string) (string, error) {
	logger := log.GetReqLogger(ctx)
	data := make(model.AssetAddressData)
	if err := json.Unmarshal([]byte(address), &data); err != nil {
		logger.Printf("failed to json.Unmarshal %v: %v", address, err)
		return "", err
	}
	qiniuPath := os.Getenv("QINIU_PATH")
	for key, value := range data {
		data[key] = qiniuPath + "/" + value
	}
	modifiedAddress, err := json.Marshal(data)
	if err != nil {
		logger.Printf("failed to json.Marshal %v: %v", data, err)
		return "", err
	}
	return string(modifiedAddress), nil
}

// ProjectList project list
func (ctrl *Controller) ProjectList(ctx context.Context, pageIndex string, pageSize string, isPublic string, authorId string) (*model.Pagination[model.Project], error) {
	logger := log.GetReqLogger(ctx)
	var wheres []model.FilterCondition
	if authorId != "" {
		wheres = append(wheres, model.FilterCondition{Column: "author_id", Operation: "=", Value: authorId})
	}
	if isPublic != "" {
		wheres = append(wheres, model.FilterCondition{Column: "is_public", Operation: "=", Value: isPublic})
	}

	pagination, err := model.QueryByPage[model.Project](ctrl.db, pageIndex, pageSize, wheres, nil)
	if err != nil {
		logger.Printf("failed to query search project : %v", err)
		return nil, err
	}
	for i := range pagination.Data {
		pagination.Data[i].Address = os.Getenv("QINIU_PATH") + "/" + pagination.Data[i].Address
	}
	return pagination, nil
}

// UpdatePublic update is_public
func (ctrl *Controller) UpdatePublic(ctx context.Context, id string, isPublic string, currentUid string) error {
	logger := log.GetReqLogger(ctx)
	project, err := model.QueryById[model.Project](ctrl.db, id)
	if err != nil {
		logger.Printf("failed to query asset : %v", err)
		return err
	}
	if project.AuthorId != currentUid {
		return ErrPermissions
	}
	return model.UpdateProjectIsPublic(ctrl.db, id, isPublic)
}

// SearchAsset Search Asset by name
func (ctrl *Controller) SearchAsset(ctx context.Context, search string, pageIndex string, pageSize string, assetType string, currentUid string) (*model.Pagination[model.Asset], error) {
	logger := log.GetReqLogger(ctx)
	var query string
	var args []interface{}
	searchString := "%" + search + "%"

	if currentUid == "" {
		query = "SELECT * FROM asset WHERE name LIKE ? AND asset_type = ? AND status = 1 AND is_public = 1"
		args = []interface{}{searchString, assetType}
	} else {
		query = "SELECT * FROM asset WHERE name LIKE ? AND asset_type = ? AND status = 1 AND (is_public = 1 OR author_id = ?)"
		args = []interface{}{searchString, assetType, currentUid}
	}
	pagination, err := model.QueryPageBySQL[model.Asset](ctrl.db, query, pageIndex, pageSize, args)
	if err != nil {
		logger.Printf("failed to query search asset : %v", err)
		return nil, err
	}
	for i, asset := range pagination.Data {
		modifiedAddress, err := ctrl.ModifyAssetAddress(ctx, asset.Address)
		if err != nil {
			logger.Printf("failed to ModifyAssetAddress: %v", err)
			return nil, err
		}
		pagination.Data[i].Address = modifiedAddress
	}
	return pagination, nil

}

func (ctrl *Controller) ImagesToGif(ctx context.Context, files []*multipart.FileHeader) (string, error) {
	logger := log.GetReqLogger(ctx)
	var images []*image.Paletted
	var delays []int
	for _, fileHeader := range files {
		// 打开文件
		img, err := utils.LoadImage(fileHeader)
		if err != nil {
			logger.Printf("failed to load image %s: %v", fileHeader.Filename, err)
			return "", err
		}
		images = append(images, img)
		delays = append(delays, 10) // 每帧之间的延迟，100 = 1秒
	}
	outGif := &gif.GIF{
		Image:     images,
		Delay:     delays,
		LoopCount: 0, // 循环次数，0表示无限循环
	}

	var gifData bytes.Buffer
	if err := gif.EncodeAll(&gifData, outGif); err != nil {
		logger.Printf("failed to encode GIF: %v", err)
		return "", err
	}
	path, err := storage.UploadFile(ctx, ctrl.bucket, os.Getenv("GIF_PATH"), &gifData, "output.gif")
	if err != nil {
		logger.Printf("failed to UploadFile: %v", err)
		return "", err
	}
	return os.Getenv("QINIU_PATH") + "/" + path, err
}

// UploadAsset Upload asset
func (ctrl *Controller) UploadAsset(ctx context.Context, name string, files []*multipart.FileHeader, previewAddress string, currentUid string, tag string, publishState string, assetType string) error {
	logger := log.GetReqLogger(ctx)
	data := make(model.AssetAddressData)
	for _, fileHeader := range files {
		file, _ := fileHeader.Open()
		var typePath string
		switch assetType {
		case model.SPRITE:
			typePath = os.Getenv("SPRITE_PATH")
		case model.BACKGROUND:
			typePath = os.Getenv("BACKGROUND_PATH")
		case model.SOUND:
			typePath = os.Getenv("SOUNDS_PATH")
		}
		path, err := storage.UploadFile(ctx, ctrl.bucket, typePath, file, fileHeader.Filename)
		if err != nil {
			logger.Printf("failed to upload %s: %v", fileHeader.Filename, err)
			return err
		}

		data[fileHeader.Filename] = path
	}
	jsonData, err := json.Marshal(data)
	if err != nil {
		logger.Printf("failed to jsonMarshal: %v", err)
		return err
	}
	isPublic, _ := strconv.Atoi(publishState)
	if isPublic != model.PUBLIC && isPublic != model.PERSONAL {
		return nil
	}
	_, err = model.AddAsset(ctrl.db, &model.Asset{
		Name:           name,
		AuthorId:       currentUid,
		Category:       tag,
		IsPublic:       isPublic,
		Address:        string(jsonData),
		PreviewAddress: previewAddress,
		AssetType:      assetType,
		ClickCount:     "0",
		Status:         1,
		CTime:          time.Now(),
		UTime:          time.Now(),
	})

	return err
}

// DeleteAsset Delete Asset
func (ctrl *Controller) DeleteAsset(ctx context.Context, id string, currentUid string) error {
	logger := log.GetReqLogger(ctx)
	asset, err := model.QueryById[model.Asset](ctrl.db, id)
	if err != nil {
		logger.Printf("failed to query asset id= %v : %v", id, err)
		return err
	}
	if asset.AuthorId != currentUid {
		return ErrPermissions
	}
	return model.DeleteAssetById(ctrl.db, id)

}
