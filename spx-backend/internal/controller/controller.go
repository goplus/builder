package controller

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"regexp"

	_ "image/png"
	"os"

	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/builder/spx-backend/internal/utils/fmtcode"
	"github.com/goplus/builder/spx-backend/internal/utils/log"
	"github.com/goplus/builder/spx-backend/internal/utils/user"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
	_ "github.com/qiniu/go-cdk-driver/kodoblob"
	qiniuAuth "github.com/qiniu/go-sdk/v7/auth"
	qiniuStorage "github.com/qiniu/go-sdk/v7/storage"
	qiniuLog "github.com/qiniu/x/log"
)

var (
	ErrNotExist     = errors.New("not exist")
	ErrUnauthorized = errors.New("unauthorized")
	ErrForbidden    = errors.New("forbidden")
)

type Controller struct {
	db   *sql.DB
	kodo *kodoConfig
}

type kodoConfig struct {
	ak           string
	sk           string
	bucket       string
	bucketRegion string
	baseUrl      string
}

func mustEnv(logger *qiniuLog.Logger, key string) string {
	value := os.Getenv(key)
	if value == "" {
		logger.Fatalf("Env %s is required", key)
	}
	return value
}

// NewController init Config
func NewController(ctx context.Context) (ret *Controller, err error) {
	logger := log.GetLogger()
	err = godotenv.Load()
	if err != nil {
		logger.Printf("failed to read env : %v", err)
		return
	}

	kc := &kodoConfig{
		ak:           mustEnv(logger, "KODO_AK"),
		sk:           mustEnv(logger, "KODO_SK"),
		bucket:       mustEnv(logger, "KODO_BUCKET"),
		bucketRegion: mustEnv(logger, "KODO_BUCKET_REGION"),
		baseUrl:      mustEnv(logger, "KODO_BASE_URL"),
	}
	dsn := mustEnv(logger, "GOP_SPX_DSN")
	// TODO: Configure connection pool and timeouts
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		logger.Printf("failed to connect sql : %v", err)
		return
	}

	return &Controller{db, kc}, nil
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

type AddProjectParams struct {
	Name     string               `json:"name"`
	Owner    string               `json:"owner"`
	Files    model.FileCollection `json:"files"`
	IsPublic model.IsPublic       `json:"isPublic"`
}

var projectNamePattern = regexp.MustCompile(`^[\w-]+$`)

// Validate validates project content, when it is used as input for adding new project
func (p *AddProjectParams) Validate() (ok bool, msg string) {
	if p.Name == "" {
		return false, "name expected"
	}
	if !projectNamePattern.Match([]byte(p.Name)) {
		return false, "invalid name"
	}
	if len(p.Name) > 100 {
		return false, "name too long"
	}
	if p.Owner == "" {
		return false, "owner expected"
	}
	if p.IsPublic != model.Personal && p.IsPublic != model.Public {
		return false, "invalid isPublic"
	}
	return true, ""
}

func (ctrl *Controller) AddProject(ctx context.Context, params *AddProjectParams) (*model.Project, error) {
	logger := log.GetReqLogger(ctx)
	user, ok := user.GetUser(ctx)
	if !ok {
		logger.Printf("no user")
		return nil, ErrUnauthorized
	}
	if user.Name != params.Owner {
		logger.Printf("user & owner not match")
		return nil, ErrForbidden
	}
	result, err := model.AddProject(ctx, ctrl.db, &model.Project{
		Name:     params.Name,
		Owner:    params.Owner,
		Files:    params.Files,
		IsPublic: params.IsPublic,
		Version:  1,
	})
	if err != nil {
		logger.Printf("add project failed: %v", err)
		return nil, err
	}
	return result, nil
}

type UpdateProjectParams struct {
	Files    model.FileCollection `json:"files"`
	IsPublic model.IsPublic       `json:"isPublic"`
}

// ValidateUpdateProject validates project content, when it is used as input for updating existed project
func (p *UpdateProjectParams) Validate() (ok bool, msg string) {
	if p.IsPublic != model.Personal && p.IsPublic != model.Public {
		return false, "invalid isPublic"
	}
	return true, ""
}

func (ctrl *Controller) UpdateProject(ctx context.Context, owner, name string, updates *UpdateProjectParams) (*model.Project, error) {
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
	result, err := model.UpdateProjectById(ctx, ctrl.db, project.ID, &model.Project{
		Files:    updates.Files,
		IsPublic: updates.IsPublic,
		Version:  project.Version + 1,
	})
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

type AddAssetParams struct {
	DisplayName string               `json:"displayName"`
	Owner       string               `json:"owner"`
	Category    string               `json:"category"`
	IsPublic    model.IsPublic       `json:"isPublic"`
	Files       model.FileCollection `json:"files"`
	Preview     string               `json:"preview"`
	AssetType   model.AssetType      `json:"assetType"`
}

func (p *AddAssetParams) Validate() (ok bool, msg string) {
	if p.DisplayName == "" {
		// TODO: more limitations
		return false, "displayName expected"
	}
	if p.Owner == "" {
		return false, "owner expected"
	}
	if p.Category == "" {
		return false, "category expected"
	}
	if p.IsPublic != model.Personal && p.IsPublic != model.Public {
		return false, "invalid isPublic"
	}
	if p.AssetType != model.AssetTypeBackdrop && p.AssetType != model.AssetTypeSound && p.AssetType != model.AssetTypeSprite {
		return false, "invalid assetType"
	}
	return true, ""
}

func (ctrl *Controller) AddAsset(ctx context.Context, params *AddAssetParams) (*model.Asset, error) {
	logger := log.GetReqLogger(ctx)
	user, ok := user.GetUser(ctx)
	if !ok {
		logger.Printf("no user")
		return nil, ErrUnauthorized
	}
	if user.Name != params.Owner {
		logger.Printf("user & owner not match")
		return nil, ErrForbidden
	}
	result, err := model.AddAsset(ctx, ctrl.db, &model.Asset{
		DisplayName: params.DisplayName,
		Owner:       params.Owner,
		Category:    params.Category,
		IsPublic:    params.IsPublic,
		Files:       params.Files,
		Preview:     params.Preview,
		AssetType:   params.AssetType,
		ClickCount:  0,
	})
	if err != nil {
		logger.Printf("add asset failed: %v", err)
		return nil, err
	}
	return result, nil
}

type UpdateAssetParams struct {
	DisplayName string               `json:"displayName"`
	Category    string               `json:"category"`
	IsPublic    model.IsPublic       `json:"isPublic"`
	Files       model.FileCollection `json:"files"`
	Preview     string               `json:"preview"`
	AssetType   model.AssetType      `json:"assetType"`
}

func (p *UpdateAssetParams) Validate() (ok bool, msg string) {
	if p.DisplayName == "" {
		// TODO: more limitations
		return false, "displayName expected"
	}
	if p.Category == "" {
		return false, "category expected"
	}
	if p.IsPublic != model.Personal && p.IsPublic != model.Public {
		return false, "invalid isPublic"
	}
	if p.AssetType != model.AssetTypeSprite && p.AssetType != model.AssetTypeBackdrop && p.AssetType != model.AssetTypeSound {
		return false, "invalid assetType"
	}
	return true, ""
}

func (ctrl *Controller) UpdateAsset(ctx context.Context, id string, updates *UpdateAssetParams) (*model.Asset, error) {
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
	result, err := model.UpdateAssetById(ctx, ctrl.db, asset.ID, &model.Asset{
		DisplayName: updates.DisplayName,
		Category:    updates.Category,
		IsPublic:    updates.IsPublic,
		Files:       updates.Files,
		Preview:     updates.Preview,
		AssetType:   updates.AssetType,
	})
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
	return fmtcode.FmtCode(ctx, input.Body, input.FixImports)
}

type UpInfo struct {
	// Uptoken
	Token string `json:"token"`
	// Valid time for uptoken, unit: second
	Expires uint64 `json:"expires"`
	// Bucket Region
	Region string `json:"region"`
	// Base URL to fetch file
	BaseUrl string `json:"baseUrl"`
}

func (ctrl *Controller) GetUpInfo(ctx context.Context) (*UpInfo, error) {
	var expires uint64 = 1800 // second
	putPolicy := qiniuStorage.PutPolicy{
		Scope:        ctrl.kodo.bucket,
		ForceSaveKey: true,
		SaveKey:      "files/$(etag)/$(fname)",
		Expires:      expires,
	}
	mac := qiniuAuth.New(ctrl.kodo.ak, ctrl.kodo.sk)
	upToken := putPolicy.UploadToken(mac)
	return &UpInfo{
		Token:   upToken,
		Expires: expires,
		Region:  ctrl.kodo.bucketRegion,
		BaseUrl: ctrl.kodo.baseUrl,
	}, nil
}
