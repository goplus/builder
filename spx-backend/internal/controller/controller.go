package controller

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	_ "image/png"
	"os"

	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/builder/spx-backend/internal/storage"
	"github.com/goplus/builder/spx-backend/internal/utils/fmtcode"
	"github.com/goplus/builder/spx-backend/internal/utils/log"
	"github.com/goplus/builder/spx-backend/internal/utils/user"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
	_ "github.com/qiniu/go-cdk-driver/kodoblob"
	"gocloud.dev/blob"
)

var (
	ErrNotExist     = errors.New("not exist")
	ErrUnauthorized = errors.New("unauthorized")
	ErrForbidden    = errors.New("forbidden")
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

// NewController init Config
func NewController(ctx context.Context, conf *Config) (ret *Controller, err error) {
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
	// TODO: Configure connection pool and timeouts
	db, err := sql.Open(driver, dsn)
	if err != nil {
		logger.Printf("failed to connect sql : %v", err)
		return
	}
	return &Controller{blobBucket, db}, nil
}

func (ctrl *Controller) GetProject(ctx context.Context, owner, name string) (*model.Project, error) {
	logger := log.GetReqLogger(ctx)
	p, err := model.GetProjectByName(ctx, ctrl.db, owner, name)
	if err != nil {
		logger.Printf("failed to get project %s/%s: %v", owner, name, err)
		return nil, err
	}
	if p.IsPublic == model.Personal {
		user, ok := user.GetUser(ctx)
		if !ok {
			return nil, ErrUnauthorized
		}
		if user.Name != p.Owner {
			return nil, ErrForbidden
		}
	}
	return p, nil
}

func (ctrl *Controller) DeleteProject(ctx context.Context, owner, name string) error {
	logger := log.GetReqLogger(ctx)
	user, ok := user.GetUser(ctx)
	if !ok {
		logger.Printf("no user")
		return ErrUnauthorized
	}
	if user.Name != owner {
		logger.Printf("user & owner not match")
		return ErrForbidden
	}
	project, err := model.GetProjectByName(ctx, ctrl.db, owner, name)
	if err != nil {
		logger.Printf("failed to get project %s/%s: %v", owner, name, err)
		return err
	}
	return model.DeleteProjectById(ctx, ctrl.db, project.ID)
}

func (ctrl *Controller) AddProject(ctx context.Context, project *model.Project) (*model.Project, error) {
	logger := log.GetReqLogger(ctx)
	user, ok := user.GetUser(ctx)
	if !ok {
		logger.Printf("no user")
		return nil, ErrUnauthorized
	}
	if user.Name != project.Owner {
		logger.Printf("user & owner not match")
		return nil, ErrForbidden
	}
	project.Version = 1
	result, err := model.AddProject(ctx, ctrl.db, project)
	if err != nil {
		logger.Printf("add project failed: %v", err)
		return nil, err
	}
	return result, nil
}

func (ctrl *Controller) UpdateProject(ctx context.Context, owner, name string, updates *model.Project) (*model.Project, error) {
	logger := log.GetReqLogger(ctx)
	user, ok := user.GetUser(ctx)
	if !ok {
		logger.Printf("no user")
		return nil, ErrUnauthorized
	}
	if user.Name != owner {
		logger.Printf("user & owner not match")
		return nil, ErrForbidden
	}
	project, err := model.GetProjectByName(ctx, ctrl.db, owner, name)
	if err != nil {
		logger.Printf("failed to get project %s/%s: %v", owner, name, err)
		return nil, err
	}
	updates.Version = project.Version + 1
	result, err := model.UpdateProjectById(ctx, ctrl.db, project.ID, updates)
	if err != nil {
		logger.Printf("update project by id failed: %v", err)
		return nil, err
	}
	return result, nil
}

type ProjectListParams struct {
	// IsPublic filters projects based on `IsPublic`, `nil` indicates that do not filter by `IsPublic`
	IsPublic *model.IsPublic
	// IsPublic filters projects based on `Owner`, `nil` indicates that do not filter by `Owner`
	Owner      *string
	Pagination model.PaginationParams
}

func (p *ProjectListParams) Validate() (ok bool, msg string) {
	// TODO
	return true, ""
}

func (ctrl *Controller) ListProject(ctx context.Context, params *ProjectListParams) (*model.ByPage[model.Project], error) {
	logger := log.GetReqLogger(ctx)

	// make sure other people's private projects not exposed
	u, _ := user.GetUser(ctx)
	if u == nil || params.Owner == nil || u.Name != *params.Owner {
		public := model.Public
		params.IsPublic = &public
	}

	var wheres []model.FilterCondition
	if params.Owner != nil {
		wheres = append(wheres, model.FilterCondition{Column: "owner", Operation: "=", Value: *params.Owner})
	}
	if params.IsPublic != nil {
		wheres = append(wheres, model.FilterCondition{Column: "is_public", Operation: "=", Value: *params.IsPublic})
	}
	byPage, err := model.ListProject(ctx, ctrl.db, params.Pagination, wheres, nil)
	if err != nil {
		logger.Printf("failed to list project: %v", err)
		return nil, err
	}
	return byPage, nil
}

// Asset returns an Asset.
func (ctrl *Controller) GetAsset(ctx context.Context, id string) (*model.Asset, error) {
	logger := log.GetReqLogger(ctx)
	asset, err := model.GetAssetById(ctx, ctrl.db, id)
	if err != nil {
		logger.Printf("failed to get asset: %v", err)
		return nil, err
	}
	if asset.IsPublic == model.Personal {
		user, ok := user.GetUser(ctx)
		if !ok {
			return nil, ErrUnauthorized
		}
		if user.Name != asset.Owner {
			return nil, ErrForbidden
		}
	}
	return asset, nil
}

type OrderBy string

var (
	DefaultOrder   OrderBy = "default"
	TimeDesc       OrderBy = "time"
	ClickCountDesc OrderBy = "clickCount"
)

type AssetListParams struct {
	// Keyword to search with, empty string (`""`) indicates that do not filter with keyword
	Keyword string
	// AssetType filters assets with `AssetType`, `nil` indicates that do not filter with `AssetType`
	AssetType *model.AssetType
	// Category filters assets with `Category`, `nil` indicates that do not filter with `Category`
	Category *string
	// IsPublic filters assets with `IsPublic`, `nil` indicates that do not filter with `IsPublic`
	IsPublic *model.IsPublic
	// IsPublic filters assets with `Owner`, `nil` indicates that do not filter with `Owner`
	Owner      *string
	OrderBy    OrderBy
	Pagination model.PaginationParams
}

func (p *AssetListParams) Validate() (ok bool, msg string) {
	// TODO
	return true, ""
}

func (ctrl *Controller) ListAsset(ctx context.Context, params *AssetListParams) (*model.ByPage[model.Asset], error) {
	logger := log.GetReqLogger(ctx)

	// make sure other people's private assets not exposed
	u, _ := user.GetUser(ctx)
	if u == nil || params.Owner == nil || u.Name != *params.Owner {
		public := model.Public
		params.IsPublic = &public
	}

	wheres := []model.FilterCondition{}
	if params.Keyword != "" {
		wheres = append(wheres, model.FilterCondition{Column: "display_name", Operation: "LIKE", Value: "%" + params.Keyword + "%"})
	}
	if params.AssetType != nil {
		wheres = append(wheres, model.FilterCondition{Column: "asset_type", Operation: "=", Value: *params.AssetType})
	}
	if params.Owner != nil {
		wheres = append(wheres, model.FilterCondition{Column: "owner", Operation: "=", Value: *params.Owner})
	}
	if params.IsPublic != nil {
		wheres = append(wheres, model.FilterCondition{Column: "is_public", Operation: "=", Value: *params.IsPublic})
	}
	if params.Category != nil {
		wheres = append(wheres, model.FilterCondition{Column: "category", Operation: "=", Value: *params.Category})
	}
	var orders []model.OrderByCondition
	if params.OrderBy == TimeDesc {
		orders = append(orders, model.OrderByCondition{Column: "c_time", Direction: "desc"})
	}
	if params.OrderBy == ClickCountDesc {
		orders = append(orders, model.OrderByCondition{Column: "click_count", Direction: "desc"})
	}
	byPage, err := model.ListAsset(ctx, ctrl.db, params.Pagination, wheres, orders)
	if err != nil {
		logger.Printf("failed to query assets : %v", err)
		return nil, err
	}
	return byPage, nil
}

func (ctrl *Controller) AddAsset(ctx context.Context, asset *model.Asset) (*model.Asset, error) {
	logger := log.GetReqLogger(ctx)
	user, ok := user.GetUser(ctx)
	if !ok {
		logger.Printf("no user")
		return nil, ErrUnauthorized
	}
	if user.Name != asset.Owner {
		logger.Printf("user & owner not match")
		return nil, ErrForbidden
	}
	asset.ClickCount = 0
	result, err := model.AddAsset(ctx, ctrl.db, asset)
	if err != nil {
		logger.Printf("add asset failed: %v", err)
		return nil, err
	}
	return result, nil
}

func (ctrl *Controller) UpdateAsset(ctx context.Context, id string, updates *model.Asset) (*model.Asset, error) {
	logger := log.GetReqLogger(ctx)
	asset, err := model.GetAssetById(ctx, ctrl.db, id)
	if err != nil {
		logger.Printf("failed to get asset %s: %v", id, err)
		return nil, err
	}
	user, ok := user.GetUser(ctx)
	if !ok {
		logger.Printf("no user")
		return nil, ErrUnauthorized
	}
	if user.Name != asset.Owner {
		logger.Printf("user & owner not match")
		return nil, ErrForbidden
	}
	updates.ClickCount = asset.ClickCount // do not use `UpdateAsset` to update click-count, use `IncreaseAssetClickCount` instead
	result, err := model.UpdateAssetById(ctx, ctrl.db, asset.ID, updates)
	if err != nil {
		logger.Printf("update asset by id failed: %v", err)
		return nil, err
	}
	return result, nil
}

// IncreaseAssetClickCount increases the click count for an asset.
func (ctrl *Controller) IncreaseAssetClickCount(ctx context.Context, id string) error {
	logger := log.GetReqLogger(ctx)
	query := fmt.Sprintf("UPDATE %s SET click_count = click_count + 1 WHERE id = ?", model.TableAsset)
	_, err := ctrl.db.ExecContext(ctx, query, id)
	if err != nil {
		logger.Printf("failed to ExecContext: %v", err)
		return err
	}
	return nil
}

// DeleteAsset Delete Asset
func (ctrl *Controller) DeleteAsset(ctx context.Context, id string) error {
	logger := log.GetReqLogger(ctx)
	asset, err := model.GetAssetById(ctx, ctrl.db, id)
	if err != nil {
		logger.Printf("failed to get asset %s: %v", id, err)
		return err
	}
	user, ok := user.GetUser(ctx)
	if !ok {
		logger.Printf("no user")
		return ErrUnauthorized
	}
	if user.Name != asset.Owner {
		logger.Printf("user & owner not match")
		return ErrForbidden
	}
	return model.DeleteAssetById(ctx, ctrl.db, id)
}

type FmtCodeInput struct {
	Body       string `json:"body"`
	FixImports bool   `json:"fixImports"`
}

// FmtCode Format code
func (ctrl *Controller) FmtCode(ctx context.Context, input *FmtCodeInput) (res *fmtcode.FormatResponse) {
	return fmtcode.FmtCode(input.Body, input.FixImports)
}
