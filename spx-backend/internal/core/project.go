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

type Data struct {
	Assets    map[string]string `json:"assets"`
	IndexJson string            `json:"indexJson"`
	Type      string            `json:"type"`
	Url       string            `json:"url"`
}

type Asset struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	AuthorId   string    `json:"authorId"`
	Category   string    `json:"category"`
	IsPublic   int       `json:"isPublic"`
	Address    string    `json:"address"`
	AssetType  string    `json:"assetType"`
	ClickCount string    `json:"clickCount"`
	Status     int       `json:"status"`
	CTime      time.Time `json:"cTime"`
	UTime      time.Time `json:"uTime"`
}

type CodeFile struct {
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

type Project struct {
	bucket *blob.Bucket
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
func New(ctx context.Context, conf *Config) (ret *Project, err error) {
	err = godotenv.Load("../.env")
	if err != nil {
		println(err.Error())
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
	println(bus)
	println(dsn)
	bucket, err := blob.OpenBucket(ctx, bus)
	if err != nil {
		println(err.Error())
		return
	}

	db, err := sql.Open(driver, dsn)
	if err != nil {
		println(err.Error())
		return
	}
	return &Project{bucket, db}, nil
}

// FileInfo Find file from db
func (p *Project) FileInfo(ctx context.Context, id string) (*CodeFile, error) {
	if id != "" {
		pro, err := common.QueryById[CodeFile](p.db, id)
		if err != nil {
			return nil, err
		}
		if pro == nil {
			return nil, err
		}
		pro.Address = os.Getenv("QINIU_PATH") + "/" + pro.Address

		return pro, nil
	}
	return nil, ErrNotExist
}

// DeleteProject Delete Project
func (p *Project) DeleteProject(ctx context.Context, id string) error {
	if id != "" {
		address := GetProjectAddress(id, p)
		err := p.bucket.Delete(ctx, address)
		if err != nil {
			return err
		}
		return DeleteProjectById(p, id)
	}
	return ErrNotExist
}

// SaveAllProject Save project
func (p *Project) SaveAllProject(ctx context.Context, codeFile *CodeFile, file multipart.File, header *multipart.FileHeader) (*CodeFile, error) {
	if codeFile.ID == "" {
		path, err := UploadFile(ctx, p, os.Getenv("PROJECT_PATH"), file, header.Filename)
		if err != nil {
			return nil, err
		}
		codeFile.Address = path
		codeFile.Version = 1
		codeFile.Status = 1
		codeFile.IsPublic = 0
		codeFile.ID, err = AddProject(p, codeFile)
		return codeFile, err
	} else {
		address := GetProjectAddress(codeFile.ID, p)
		version := GetProjectVersion(codeFile.ID, p)
		err := p.bucket.Delete(ctx, address)
		if err != nil {
			return nil, err
		}
		path, err := UploadFile(ctx, p, os.Getenv("PROJECT_PATH"), file, header.Filename)
		if err != nil {
			return nil, err
		}
		codeFile.Address = path
		codeFile.Version = version + 1
		return codeFile, UpdateProject(p, codeFile)
	}
}

// CodeFmt Format code
func (p *Project) CodeFmt(ctx context.Context, body, fiximport string) (res *FormatResponse) {

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
func (p *Project) Asset(ctx context.Context, id string) (*Asset, error) {
	asset, err := common.QueryById[Asset](p.db, id)
	if err != nil {
		return nil, err
	}
	if asset == nil {
		return nil, err
	}
	modifiedAddress, err := p.ModifyAddress(asset.Address)
	if err != nil {
		return nil, err
	}
	asset.Address = modifiedAddress

	return asset, nil
}

// AssetPubList list public assets
func (p *Project) AssetPubList(ctx context.Context, pageIndex string, pageSize string, assetType string, category string, isOrderByTime string, isOrderByHot string) (*common.Pagination[Asset], error) {
	wheres := []common.FilterCondition{
		{Column: "asset_type", Operation: "=", Value: assetType},
	}

	wheres = append(wheres, common.FilterCondition{Column: "is_public", Operation: "=", Value: "1"})
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
	pagination, err := common.QueryByPage[Asset](p.db, pageIndex, pageSize, wheres, orders)
	for i, asset := range pagination.Data {
		modifiedAddress, err := p.ModifyAddress(asset.Address)
		if err != nil {
			return nil, err
		}
		pagination.Data[i].Address = modifiedAddress
	}
	if err != nil {
		return nil, err
	}
	return pagination, nil
}

// UserAssetList list personal assets
func (p *Project) UserAssetList(ctx context.Context, pageIndex string, pageSize string, assetType string, category string, isOrderByTime string, isOrderByHot string, uid string) (*common.Pagination[Asset], error) {
	wheres := []common.FilterCondition{
		{Column: "asset_type", Operation: "=", Value: assetType},
	}
	var orders []common.OrderByCondition
	if category != "" {
		wheres = append(wheres, common.FilterCondition{Column: "category", Operation: "=", Value: category})
	}
	wheres = append(wheres, common.FilterCondition{Column: "author_id", Operation: "=", Value: uid})
	if isOrderByTime != "" {
		orders = append(orders, common.OrderByCondition{Column: "c_time", Direction: "desc"})
	}
	if isOrderByHot != "" {
		orders = append(orders, common.OrderByCondition{Column: "click_count", Direction: "desc"})
	}
	pagination, err := common.QueryByPage[Asset](p.db, pageIndex, pageSize, wheres, orders)
	for i, asset := range pagination.Data {
		modifiedAddress, err := p.ModifyAddress(asset.Address)
		if err != nil {
			return nil, err
		}
		pagination.Data[i].Address = modifiedAddress
	}
	if err != nil {
		return nil, err
	}
	return pagination, nil
}

// IncrementAssetClickCount increments the click count for an asset.
func (p *Project) IncrementAssetClickCount(ctx context.Context, id string, assetType string) error {
	query := "UPDATE asset SET click_count = click_count + 1 WHERE id = ? and asset_type = ?"
	_, err := p.db.ExecContext(ctx, query, id, assetType)
	if err != nil {
		return err
	}
	return nil
}

// ModifyAddress transfers relative path to download url
func (p *Project) ModifyAddress(address string) (string, error) {
	var data Data
	if err := json.Unmarshal([]byte(address), &data); err != nil {
		return "", err
	}
	qiniuPath := os.Getenv("QINIU_PATH")
	for key, value := range data.Assets {
		data.Assets[key] = qiniuPath + "/" + value
	}
	if data.IndexJson != "" {
		data.IndexJson = qiniuPath + "/" + data.IndexJson
	}
	if data.Url != "" {
		data.Url = qiniuPath + "/" + data.Url
	}
	modifiedAddress, err := json.Marshal(data)
	if err != nil {
		return "", err
	}
	return string(modifiedAddress), nil
}

// PubProjectList Public project list
func (p *Project) PubProjectList(ctx context.Context, pageIndex string, pageSize string) (*common.Pagination[CodeFile], error) {
	wheres := []common.FilterCondition{
		{Column: "is_public", Operation: "=", Value: 1},
	}
	pagination, err := common.QueryByPage[CodeFile](p.db, pageIndex, pageSize, wheres, nil)
	if err != nil {
		return nil, err
	}
	for i := range pagination.Data {
		pagination.Data[i].Address = os.Getenv("QINIU_PATH") + "/" + pagination.Data[i].Address
	}
	return pagination, nil
}

// UserProjectList user project list
func (p *Project) UserProjectList(ctx context.Context, pageIndex string, pageSize string, uid string) (*common.Pagination[CodeFile], error) {
	wheres := []common.FilterCondition{
		{Column: "author_id", Operation: "=", Value: uid},
	}
	pagination, err := common.QueryByPage[CodeFile](p.db, pageIndex, pageSize, wheres, nil)
	if err != nil {
		return nil, err
	}
	for i := range pagination.Data {
		pagination.Data[i].Address = os.Getenv("QINIU_PATH") + "/" + pagination.Data[i].Address
	}
	return pagination, nil
}

// UpdatePublic update is_public
func (p *Project) UpdatePublic(ctx context.Context, id string) error {
	return UpdateProjectIsPublic(p, id)
}

func (p *Project) SaveAsset(ctx context.Context, asset *Asset, file multipart.File, header *multipart.FileHeader) (*Asset, error) {
	address := GetAssetAddress(asset.ID, p)
	var data struct {
		Assets    map[string]string `json:"assets"`
		IndexJson string            `json:"indexJson"`
	}
	if err := json.Unmarshal([]byte(address), &data); err != nil {
		return nil, err
	}
	for _, value := range data.Assets {
		address = value // find /sounds/sound.wav
		break
	}
	err := p.bucket.Delete(ctx, address)
	if err != nil {
		return nil, err
	}
	path, err := UploadFile(ctx, p, os.Getenv("SOUNDS_PATH"), file, header.Filename)
	jsonBytes, err := json.Marshal(map[string]map[string]string{"assets": {"sound": path}})
	if err != nil {
		return nil, err
	}
	asset.Address = string(jsonBytes)
	println(asset.Address)
	if err != nil {
		return nil, err
	}
	return asset, UpdateAsset(p, asset)
}

// SearchAsset Search Asset by name
func (p *Project) SearchAsset(ctx context.Context, search string, assetType string) ([]*Asset, error) {
	query := "SELECT * FROM asset WHERE name LIKE ? AND asset_type = ?"
	searchString := "%" + search + "%"

	// 执行查询
	rows, err := p.db.Query(query, searchString, assetType)
	if err != nil {
		println(err.Error())
		return nil, err
	}
	defer rows.Close()

	// 创建指向 Asset 结构体切片的指针
	var assets []*Asset

	// 遍历结果集
	for rows.Next() {
		var asset Asset
		err := rows.Scan(&asset.ID, &asset.Name, &asset.AuthorId, &asset.Category, &asset.IsPublic, &asset.Address, &asset.AssetType, &asset.ClickCount, &asset.Status, &asset.CTime, &asset.UTime)
		if err != nil {
			println(err.Error())
			return nil, err
		}
		asset.Address, _ = p.ModifyAddress(asset.Address)
		// 将每行数据追加到切片中
		assets = append(assets, &asset)
	}
	if len(assets) == 0 {
		return nil, nil
	}
	return assets, nil

}

func (p *Project) ImagesToGif(ctx context.Context, files []*multipart.FileHeader) (string, error) {
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
	path, err := UploadFile(ctx, p, os.Getenv("GIF_PATH"), f, "output.gif")
	if err != nil {
		return "", err
	}
	return os.Getenv("QINIU_PATH") + "/" + path, err
}

// UploadSprite Upload imgs to gif
func (p *Project) UploadSprite(ctx context.Context, name string, files []*multipart.FileHeader, gifPath string, uid string, tag string, publishState string) error {
	data := &Data{}
	data.IndexJson = "index.json"
	data.Type = "gif"
	data.Assets = make(map[string]string)
	for i, fileHeader := range files {
		file, _ := fileHeader.Open()
		path, err := UploadFile(ctx, p, os.Getenv("SPRITE_PATH"), file, fileHeader.Filename)
		if err != nil {
			fmt.Printf("failed to upload %s: %v", fileHeader.Filename, err)
			return err
		}
		index := "image" + strconv.Itoa(i)
		data.Assets[index] = path
	}

	data.Url = gifPath[len(os.Getenv("QINIU_PATH")):]
	jsonData, err := json.Marshal(data)
	if err != nil {
		fmt.Printf("failed to jsonMarshal: %v", err)
		return err
	}
	isPublic, _ := strconv.Atoi(publishState)
	if isPublic != 0 {
		_, err = AddAsset(p, &Asset{
			Name:       name,
			AuthorId:   uid,
			Category:   tag,
			IsPublic:   isPublic - 1,
			Address:    string(jsonData),
			AssetType:  "0",
			ClickCount: "0",
			Status:     1,
			CTime:      time.Now(),
			UTime:      time.Now(),
		})
	}

	return err
}
