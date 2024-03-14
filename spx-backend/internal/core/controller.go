package core

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/gif"
	_ "image/png"
	"io/ioutil"
	"mime/multipart"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/goplus/builder/spx-backend/internal/common"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
	_ "github.com/qiniu/go-cdk-driver/kodoblob"
	"gocloud.dev/blob"
	"golang.org/x/tools/imports"
)

var (
	ErrNotExist = os.ErrNotExist
)

type Config struct {
	Driver string // database driver. default is `mysql`.
	DSN    string // database data source name
	BlobUS string // blob URL scheme
}

type AssetAddressData map[string]string

type Asset struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	AuthorId       string    `json:"authorId"`
	Category       string    `json:"category"`
	IsPublic       int       `json:"isPublic"` // 1:Public state 0: Personal state
	Address        string    `json:"address"`  // The partial path of the asset's location, excluding the host. like 'sprite/xxx.svg'
	PreviewAddress string    `json:"previewAddress"`
	AssetType      string    `json:"assetType"` // 0：sprite，1：background，2：sound
	ClickCount     string    `json:"clickCount"`
	Status         int       `json:"status"` // 1:Normal state 0:Deleted status
	CTime          time.Time `json:"cTime"`
	UTime          time.Time `json:"uTime"`
}

type Project struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	AuthorId string    `json:"authorId"`
	Address  string    `json:"address"`
	IsPublic int       `json:"isPublic"`
	Status   int       `json:"status"`
	Version  int       `json:"version"`
	Ctime    time.Time `json:"cTime"`
	Utime    time.Time `json:"uTime"`
}

type Controller struct {
	bucket Bucket
	db     *sql.DB
}

type FormatError struct {
	Column int
	Line   int
	Msg    string
}
type FormatResponse struct {
	Body  string
	Error FormatError
}

// New init Config
func New(ctx context.Context, conf *Config) (ret *Controller, err error) {
	err = godotenv.Load()
	if err != nil {
		fmt.Printf("failed to read env : %v", err)
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
		fmt.Printf("failed to connect kodo : %v", err)
		return
	}
	blobBucket := &BlobBucket{b: bucket}
	db, err := sql.Open(driver, dsn)
	if err != nil {
		fmt.Printf("failed to connect sql : %v", err)
		return
	}
	return &Controller{blobBucket, db}, nil
}

// ProjectInfo Find project from db
func (ctrl *Controller) ProjectInfo(ctx context.Context, id string, currentUid string) (*Project, error) {
	pro, err := common.QueryById[Project](ctrl.db, id)
	if err != nil {
		fmt.Printf("failed to query project id= %v : %v", id, err)
		return nil, err
	}
	if pro == nil {
		return nil, ErrNotExist
	}
	pro.Address = os.Getenv("QINIU_PATH") + "/" + pro.Address
	if pro.IsPublic == common.PUBLIC || currentUid == pro.AuthorId {
		return pro, nil
	}

	return nil, common.ErrPermissions
}

// DeleteProject Delete Project
func (ctrl *Controller) DeleteProject(ctx context.Context, id string, currentUid string) error {

	project, err := common.QueryById[Project](ctrl.db, id)
	if err != nil {
		fmt.Printf("failed to query project id= %v : %v", id, err)
		return err
	}
	if project.AuthorId != currentUid {
		return common.ErrPermissions
	}
	return DeleteProjectById(ctrl.db, id)

}

// SaveProject Save project
func (ctrl *Controller) SaveProject(ctx context.Context, project *Project, file multipart.File, header *multipart.FileHeader) (*Project, error) {
	if project.ID == "" {
		path, err := UploadFile(ctx, ctrl.bucket, os.Getenv("PROJECT_PATH"), file, header.Filename)
		if err != nil {
			fmt.Printf("failed to UploadFile %v : %v", header.Filename, err)
			return nil, err
		}
		project.Address = path
		project.Version = 1
		project.Status = 1
		project.IsPublic = common.PERSONAL
		project.Ctime = time.Now()
		project.Utime = time.Now()
		project.ID, err = AddProject(ctrl.db, project)
		project.Address = os.Getenv("QINIU_PATH") + "/" + path
		return project, err
	} else {

		p, err := common.QueryById[Project](ctrl.db, project.ID)
		if err != nil {
			fmt.Printf("failed to query project id= %v : %v", project.ID, err)
			return nil, err
		}
		if p.Address == "" {
			return nil, common.ErrProjectNotExist
		}
		err = ctrl.bucket.Delete(ctx, p.Address)
		if err != nil {
			fmt.Printf("failed to delete kodo File %v : %v", p.Address, err)
			return nil, err
		}
		path, err := UploadFile(ctx, ctrl.bucket, os.Getenv("PROJECT_PATH"), file, header.Filename)
		if err != nil {
			fmt.Printf("failed to UploadFile %v : %v", header.Filename, err)
			return nil, err
		}
		p.Address = path
		p.Version = p.Version + 1
		p.Name = project.Name
		err = UpdateProject(ctrl.db, p)
		p.Address = os.Getenv("QINIU_PATH") + "/" + path
		return p, err
	}
}

// CodeFmt Format code
func (ctrl *Controller) CodeFmt(ctx context.Context, body, fiximport string) (res *FormatResponse) {

	fs, err := splitFiles([]byte(body))
	if err != nil {
		fmtErr := ExtractErrorInfo(err.Error())
		res = &FormatResponse{
			Body:  "",
			Error: fmtErr,
		}
		return
	}
	fixImports := fiximport != ""
	for _, f := range fs.files {
		switch {
		case path.Ext(f) == ".go":
			var out []byte
			var err error
			in := fs.Data(f)
			if fixImports {
				// TODO: pass options to imports.Process so it
				// can find symbols in sibling files.
				out, err = imports.Process(f, in, nil)
			} else {
				var tmpDir string
				tmpDir, err = os.MkdirTemp("", "gopformat")
				if err != nil {
					fmtErr := ExtractErrorInfo(err.Error())
					res = &FormatResponse{
						Body:  "",
						Error: fmtErr,
					}
					return
				}
				defer os.RemoveAll(tmpDir)
				tmpGopFile := filepath.Join(tmpDir, "prog.gop")
				if err = os.WriteFile(tmpGopFile, in, 0644); err != nil {
					fmtErr := ExtractErrorInfo(err.Error())
					res = &FormatResponse{
						Body:  "",
						Error: fmtErr,
					}
					return
				}
				cmd := exec.Command("gop", "fmt", "-smart", tmpGopFile)
				//gop fmt returns error result in stdout, so we do not need to handle stderr
				//err is to check gop fmt return code
				var fmtErr []byte
				fmtErr, err = cmd.Output()
				if err != nil {
					fmtErr := ExtractErrorInfo(strings.Replace(string(fmtErr), tmpGopFile, "prog.gop", -1))
					res = &FormatResponse{
						Body:  "",
						Error: fmtErr,
					}
					return
				}
				out, err = ioutil.ReadFile(tmpGopFile)
				if err != nil {
					err = errors.New("interval error when formatting gop code")
				}
			}
			if err != nil {
				errMsg := err.Error()
				if !fixImports {
					// Unlike imports.Process, format.Source does not prefix
					// the error with the file path. So, do it ourselves here.
					errMsg = fmt.Sprintf("%v:%v", f, errMsg)
				}
				fmtErr := ExtractErrorInfo(errMsg)
				res = &FormatResponse{
					Body:  "",
					Error: fmtErr,
				}
				return
			}
			fs.AddFile(f, out)
		case path.Base(f) == "go.mod":
			out, err := common.FormatGoMod(f, fs.Data(f))
			if err != nil {
				fmtErr := ExtractErrorInfo(err.Error())
				res = &FormatResponse{
					Body:  "",
					Error: fmtErr,
				}
				return
			}
			fs.AddFile(f, out)
		}
	}
	res = &FormatResponse{
		Body:  string(fs.Format()),
		Error: FormatError{},
	}
	return
}

// Asset returns an Asset.
func (ctrl *Controller) Asset(ctx context.Context, id string, currentUid string) (*Asset, error) {
	asset, err := common.QueryById[Asset](ctrl.db, id)
	if err != nil {
		fmt.Printf("failed to query assets : %v", err)
		return nil, err
	}
	if asset == nil {
		return nil, ErrNotExist
	}
	modifiedAddress, err := ctrl.ModifyAssetAddress(asset.Address)
	if err != nil {
		fmt.Printf("failed to ModifyAssetAddress %v : %v", asset.Address, err)
		return nil, err
	}
	asset.Address = modifiedAddress

	if asset.IsPublic == common.PUBLIC || currentUid == asset.AuthorId {
		return asset, nil
	}

	return nil, common.ErrPermissions
}

// AssetList list  assets
func (ctrl *Controller) AssetList(ctx context.Context, pageIndex string, pageSize string, assetType string, category string, isOrderByTime string, isOrderByHot string, authorId string, isPublic string) (*common.Pagination[Asset], error) {
	wheres := []common.FilterCondition{
		{Column: "asset_type", Operation: "=", Value: assetType},
	}
	if authorId != "" {
		wheres = append(wheres, common.FilterCondition{Column: "author_id", Operation: "=", Value: authorId})
	}
	if isPublic != "" {
		wheres = append(wheres, common.FilterCondition{Column: "is_public", Operation: "=", Value: isPublic})
	}
	var orders []common.OrderByCondition
	if category != "" {
		wheres = append(wheres, common.FilterCondition{Column: "category", Operation: "=", Value: category})
	}
	if isOrderByTime != "" {
		orders = append(orders, common.OrderByCondition{Column: "c_time", Direction: "desc"})
	}
	if isOrderByHot != "" {
		orders = append(orders, common.OrderByCondition{Column: "click_count", Direction: "desc"})
	}
	pagination, err := common.QueryByPage[Asset](ctrl.db, pageIndex, pageSize, wheres, orders)
	if err != nil {
		fmt.Printf("failed to query assets : %v", err)
		return nil, err
	}
	for i, asset := range pagination.Data {
		modifiedAddress, err := ctrl.ModifyAssetAddress(asset.Address)
		if err != nil {
			fmt.Printf("failed to ModifyAssetAddress %v : %v", asset.Address, err)
			return nil, err
		}
		pagination.Data[i].Address = modifiedAddress
	}
	return pagination, nil
}

// IncrementAssetClickCount increments the click count for an asset.
func (ctrl *Controller) IncrementAssetClickCount(ctx context.Context, id string) error {
	query := "UPDATE asset SET click_count = click_count + 1 WHERE id = ?"
	_, err := ctrl.db.ExecContext(ctx, query, id)
	if err != nil {
		fmt.Printf("failed to Incre Asset Click Count : %v", err)
		return err
	}
	return nil
}

// ModifyAssetAddress transfers relative path to download url
func (ctrl *Controller) ModifyAssetAddress(address string) (string, error) {
	data := make(AssetAddressData)
	if err := json.Unmarshal([]byte(address), &data); err != nil {
		fmt.Printf("failed to json.Unmarshal %v: %v", address, err)
		return "", err
	}
	qiniuPath := os.Getenv("QINIU_PATH")
	for key, value := range data {
		data[key] = qiniuPath + "/" + value
	}
	modifiedAddress, err := json.Marshal(data)
	if err != nil {
		fmt.Printf("failed to json.Marshal %v: %v", data, err)
		return "", err
	}
	return string(modifiedAddress), nil
}

// ProjectList project list
func (ctrl *Controller) ProjectList(ctx context.Context, pageIndex string, pageSize string, isPublic string, authorId string) (*common.Pagination[Project], error) {
	var wheres []common.FilterCondition
	if authorId != "" {
		wheres = append(wheres, common.FilterCondition{Column: "author_id", Operation: "=", Value: authorId})
	}
	if isPublic != "" {
		wheres = append(wheres, common.FilterCondition{Column: "is_public", Operation: "=", Value: isPublic})
	}

	pagination, err := common.QueryByPage[Project](ctrl.db, pageIndex, pageSize, wheres, nil)
	if err != nil {
		fmt.Printf("failed to query search project : %v", err)
		return nil, err
	}
	for i := range pagination.Data {
		pagination.Data[i].Address = os.Getenv("QINIU_PATH") + "/" + pagination.Data[i].Address
	}
	return pagination, nil
}

// UpdatePublic update is_public
func (ctrl *Controller) UpdatePublic(ctx context.Context, id string, isPublic string, currentUid string) error {
	project, err := common.QueryById[Project](ctrl.db, id)
	if err != nil {
		fmt.Printf("failed to query asset : %v", err)
		return err
	}
	if project.AuthorId != currentUid {
		return common.ErrPermissions
	}
	return UpdateProjectIsPublic(ctrl.db, id, isPublic)
}

// SearchAsset Search Asset by name
func (ctrl *Controller) SearchAsset(ctx context.Context, search string, pageIndex string, pageSize string, assetType string, currentUid string) (*common.Pagination[Asset], error) {

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
	pagination, err := common.QueryPageBySQL[Asset](ctrl.db, query, pageIndex, pageSize, args)
	if err != nil {
		fmt.Printf("failed to query search asset : %v", err)
		return nil, err
	}
	for i, asset := range pagination.Data {
		modifiedAddress, err := ctrl.ModifyAssetAddress(asset.Address)
		if err != nil {
			fmt.Printf("failed to ModifyAssetAddress: %v", err)
			return nil, err
		}
		pagination.Data[i].Address = modifiedAddress
	}
	return pagination, nil

}

func (ctrl *Controller) ImagesToGif(ctx context.Context, files []*multipart.FileHeader) (string, error) {
	var images []*image.Paletted
	var delays []int
	for _, fileHeader := range files {
		// 打开文件
		img, err := common.LoadImage(fileHeader)
		if err != nil {
			fmt.Printf("failed to load image %s: %v", fileHeader.Filename, err)
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

	// 保存GIF文件
	f, err := os.Create("output.gif")
	if err != nil {
		fmt.Printf("failed to create GIF file: %v", err)
		return "", err
	}
	defer f.Close()
	if err := gif.EncodeAll(f, outGif); err != nil {
		fmt.Printf("failed to encode GIF: %v", err)
		return "", err
	}
	f.Seek(0, 0)
	path, err := UploadFile(ctx, ctrl.bucket, os.Getenv("GIF_PATH"), f, "output.gif")
	if err != nil {
		fmt.Printf("failed to UploadFile: %v", err)
		return "", err
	}
	return os.Getenv("QINIU_PATH") + "/" + path, err
}

// UploadAsset Upload asset
func (ctrl *Controller) UploadAsset(ctx context.Context, name string, files []*multipart.FileHeader, previewAddress string, currentUid string, tag string, publishState string, assetType string) error {
	data := make(AssetAddressData)
	for _, fileHeader := range files {
		file, _ := fileHeader.Open()
		var typePath string
		switch assetType {
		case common.SPRITE:
			typePath = os.Getenv("SPRITE_PATH")
		case common.BACKGROUND:
			typePath = os.Getenv("BACKGROUND_PATH")
		case common.SOUND:
			typePath = os.Getenv("SOUNDS_PATH")
		}
		path, err := UploadFile(ctx, ctrl.bucket, typePath, file, fileHeader.Filename)
		if err != nil {
			fmt.Printf("failed to upload %s: %v", fileHeader.Filename, err)
			return err
		}

		data[fileHeader.Filename] = path
	}
	jsonData, err := json.Marshal(data)
	if err != nil {
		fmt.Printf("failed to jsonMarshal: %v", err)
		return err
	}
	isPublic, _ := strconv.Atoi(publishState)
	if isPublic != common.PUBLIC && isPublic != common.PERSONAL {
		return nil
	}
	_, err = AddAsset(ctrl.db, &Asset{
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

	asset, err := common.QueryById[Asset](ctrl.db, id)
	if err != nil {
		fmt.Printf("failed to query asset id= %v : %v", id, err)
		return err
	}
	if asset.AuthorId != currentUid {
		return common.ErrPermissions
	}
	return DeleteAssetById(ctrl.db, id)

}
