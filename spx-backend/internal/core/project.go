package core

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/goplus/builder/spx-backend/internal/common"

	_ "github.com/go-sql-driver/mysql"
	"github.com/google/uuid"
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

type Asset struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	AuthorId  string    `json:"authorId"`
	Category  string    `json:"category"`
	IsPublic  int       `json:"isPublic"`
	Address   string    `json:"address"`
	AssetType string    `json:"assetType"`
	Status    int       `json:"status"`
	CTime     time.Time `json:"cTime"`
	UTime     time.Time `json:"uTime"`
}

type CodeFile struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	AuthorId string
	Address  string
	IsPublic int
	Status   int
	Version  int
	Ctime    time.Time
	Utime    time.Time
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

type SaveProjectRequest struct {
	ID       string            `json:"id,omitempty"`
	Name     string            `json:"name"`
	AuthorId string            `json:"uid"`
	Files    map[string]string `json:"files"`
	IsPublic int               `json:"isPublic"`
}

func New(ctx context.Context, conf *Config) (ret *Project, err error) {
	_ = godotenv.Load("../.env")
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

func (p *Project) GetProjectDetail(ctx context.Context, id string) (*CodeFile, error) {
	if id != "" {
		codeFile, _ := common.QueryById[CodeFile](p.db, id)
		if codeFile == nil {
			return nil, ErrNotExist
		}
		return codeFile, nil
	}
	return nil, ErrNotExist
}

func (p *Project) SaveProject(ctx context.Context, req SaveProjectRequest) (*CodeFile, error) {
	filesJson, err := json.Marshal(req.Files)
	if err != nil {
		return nil, err
	}
	files := string(filesJson)
	if req.ID == "" {
		codeFile := &CodeFile{
			ID:       uuid.New().String(),
			Name:     req.Name,
			AuthorId: req.AuthorId,
			IsPublic: req.IsPublic,
			Address:  files,
			Status:   1,
			Ctime:    time.Now(),
			Utime:    time.Now(),
		}
		err := AddProject(p, codeFile)
		if err != nil {
			return nil, err
		}
		codeFile.Version = 1
		return codeFile, nil
	} else {
		codeFile, err := p.GetProjectDetail(ctx, req.ID)
		if err != nil {
			return nil, err
		}
		codeFile.Name = req.Name
		codeFile.Address = files
		codeFile.Version++
		codeFile.Utime = time.Now()
		return codeFile, UpdateProject(p, codeFile)
	}
}

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
	modifiedAddress, err := p.modifyAddress(asset.Address)
	if err != nil {
		return nil, err
	}
	asset.Address = modifiedAddress

	return asset, nil
}

// AssetList list assets
func (p *Project) AssetList(ctx context.Context, pageIndex string, pageSize string, assetType string) (*common.Pagination[Asset], error) {
	wheres := []common.FilterCondition{
		{Column: "asset_type", Operation: "=", Value: assetType},
	}
	pagination, err := common.QueryByPage[Asset](p.db, pageIndex, pageSize, wheres)
	for i, asset := range pagination.Data {
		modifiedAddress, err := p.modifyAddress(asset.Address)
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

// modifyAddress transfers relative path to download url
func (p *Project) modifyAddress(address string) (string, error) {
	var data struct {
		Assets    map[string]string `json:"assets"`
		IndexJson string            `json:"indexJson"`
	}
	if err := json.Unmarshal([]byte(address), &data); err != nil {
		return "", err
	}
	qiniuPath := os.Getenv("QINIU_PATH") // TODO: Replace with real URL prefix
	for key, value := range data.Assets {
		data.Assets[key] = qiniuPath + value
	}
	if data.IndexJson != "" {
		data.IndexJson = qiniuPath + data.IndexJson
	}
	modifiedAddress, err := json.Marshal(data)
	if err != nil {
		return "", err
	}
	return string(modifiedAddress), nil
}
