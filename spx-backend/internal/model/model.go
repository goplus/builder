package model

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/goplus/builder/spx-backend/internal/utils/log"
)

type IsPublic int

const (
	Personal IsPublic = iota
	Public
)

// Delete status for Project & Asset
type Status int

const (
	StatusDeleted Status = iota
	StatusNormal
)

type AssetType int

const (
	AssetTypeSprite = iota
	AssetTypeBackdrop
	AssetTypeSound
)

// Files information for Projetc / Asset, map from relative-path to absolute-url
type FileCollection map[string]string

func (f *FileCollection) Scan(src interface{}) error {
	var source []byte
	_m := make(map[string]string)
	switch src := src.(type) {
	case []uint8:
		source = []byte(src)
	case nil:
		return nil
	default:
		return errors.New("incompatible type for FileCollection")
	}
	err := json.Unmarshal(source, &_m)
	if err != nil {
		return err
	}
	*f = FileCollection(_m)
	return nil
}

func (f FileCollection) Value() (driver.Value, error) {
	// if len(f) == 0 {
	// 	return nil, nil
	// }
	j, err := json.Marshal(f)
	if err != nil {
		return nil, err
	}
	return driver.Value(j), nil
}

type Asset struct {
	// Globally unique ID
	ID string `json:"id"`
	// Name to display
	DisplayName string `json:"displayName"`
	// Name of asset owner
	Owner string `json:"owner"`
	// Asset Category
	Category string `json:"category"`
	// Public status
	IsPublic IsPublic `json:"isPublic"`
	// Files the asset contains
	Files FileCollection `json:"files"`
	// Preview URL for the asset, e.g., a gif for a sprite
	Preview string `json:"preview"`
	// Asset Type
	AssetType AssetType `json:"assetType"`
	// Click count of the asset
	ClickCount int64 `json:"clickCount"`
	// Status (if asset is deleted)
	Status Status `json:"status"`
	// Create Time
	CTime time.Time `json:"cTime"`
	// Update Time
	UTime time.Time `json:"uTime"`
}

// ValidateAddAsset validates project content, when it is used as input for adding new project
// TODO: we should define standalone struct for inputs & implement validation on inputs' struct
func (a *Asset) ValidateAddAsset() (ok bool, msg string) {
	if a.ID != "" {
		return false, "id not expected"
	}
	if a.DisplayName == "" {
		// TODO: more limitations
		return false, "displayName expected"
	}
	if a.Owner == "" {
		return false, "owner expected"
	}
	if a.Category == "" {
		return false, "category expected"
	}
	if a.IsPublic != Personal && a.IsPublic != Public {
		return false, "invalid isPublic"
	}
	if a.AssetType != AssetTypeBackdrop && a.AssetType != AssetTypeSound && a.AssetType != AssetTypeSprite {
		return false, "invalid assetType"
	}
	if a.ClickCount != 0 {
		return false, "clickCount not expected"
	}
	return true, ""
}

// ValidateUpdateAsset validates project content, when it is used as input for updating existed project
// TODO: we should define standalone struct for inputs & implement validation on inputs' struct
func (a *Asset) ValidateUpdateAsset() (ok bool, msg string) {
	if a.ID != "" {
		return false, "id not expected"
	}
	if a.Owner != "" {
		return false, "owner not expected"
	}
	if a.IsPublic != Personal && a.IsPublic != Public {
		return false, "invalid isPublic"
	}
	if a.AssetType != AssetTypeSprite && a.AssetType != AssetTypeBackdrop && a.AssetType != AssetTypeSound {
		return false, "invalid assetType"
	}
	if a.ClickCount != 0 {
		return false, "clickCount not expected"
	}
	return true, ""
}

type Project struct {
	// Globally Unique ID
	ID string `json:"id"`
	// Project name, unique for projects of same owner
	Name string `json:"name"`
	// Name of project owner
	Owner string `json:"owner"`
	// Files the project contains
	Files FileCollection `json:"files"`
	// Public status
	IsPublic IsPublic `json:"isPublic"`
	// Project version
	Version int `json:"version"`
	// Status (if asset is deleted)
	Status Status `json:"status"`
	// Create Time
	CTime time.Time `json:"cTime"`
	// Update Time
	UTime time.Time `json:"uTime"`
}

// ValidateAddProject validates project content, when it is used as input for adding new project
// TODO: we should define standalone struct for inputs & implement validation on inputs' struct
func (p *Project) ValidateAddProject() (ok bool, msg string) {
	if p.ID != "" {
		return false, "id not expected"
	}
	if p.Name == "" {
		// TODO: more limitations
		return false, "name expected"
	}
	if p.Owner == "" {
		return false, "owner expected"
	}
	if p.IsPublic != Personal && p.IsPublic != Public {
		return false, "invalid isPublic"
	}
	return true, ""
}

// ValidateUpdateProject validates project content, when it is used as input for updating existed project
// TODO: we should define standalone struct for inputs & implement validation on inputs' struct
func (p *Project) ValidateUpdateProject() (ok bool, msg string) {
	if p.ID != "" {
		return false, "id not expected"
	}
	if p.Name != "" {
		return false, "name not expected"
	}
	if p.Owner != "" {
		return false, "owner not expected"
	}
	if p.IsPublic != Personal && p.IsPublic != Public {
		return false, "invalid isPublic"
	}
	return true, ""
}

var (
	// ErrExisted is returned for adding resource when resource with same identifier (id, project owner+name) already existed
	ErrExisted = errors.New("already existed")
)

const TableProject = "project"
const TableAsset = "asset"

// GetAssetById get asset with given id, returns `models.ErrNotExist` if it does not exist
func GetAssetById(ctx context.Context, db *sql.DB, id string) (*Asset, error) {
	return GetById[Asset](ctx, db, TableAsset, id)
}

func AddAsset(ctx context.Context, db *sql.DB, a *Asset) (*Asset, error) {
	logger := log.GetReqLogger(ctx)
	now := time.Now()
	sqlStr := fmt.Sprintf("insert into %s (display_name, owner, category, is_public, files, preview, asset_type, click_count, status, c_time, u_time) values (?,?,?,?,?,?,?,?,?,?,?)", TableAsset)
	res, err := db.Exec(sqlStr, a.DisplayName, a.Owner, a.Category, a.IsPublic, a.Files, a.Preview, a.AssetType, a.ClickCount, StatusNormal, now, now)
	if err != nil {
		logger.Printf("exec failed: %v", err)
		return nil, err
	}
	idInt, err := res.LastInsertId()
	if err != nil {
		logger.Printf("get last insert id failed: %v", err)
		return nil, err
	}
	resultAsset, err := GetAssetById(ctx, db, strconv.Itoa(int(idInt)))
	if err != nil {
		logger.Printf("get asset by id failed: %v", err)
		return nil, err
	}
	return resultAsset, err
}

func UpdateAssetById(ctx context.Context, db *sql.DB, id string, updates *Asset) (*Asset, error) {
	logger := log.GetReqLogger(ctx)
	query := fmt.Sprintf("UPDATE %s SET display_name = ?, category = ?, is_public = ?, files = ?, preview = ?, asset_type = ?, u_time = ? WHERE id = ?", TableAsset)
	stmt, err := db.Prepare(query)
	if err != nil {
		logger.Printf("db prepare failed: %v", err)
		return nil, err
	}
	defer stmt.Close()
	_, err = stmt.ExecContext(ctx, updates.DisplayName, updates.Category, updates.IsPublic, updates.Files, updates.Preview, updates.AssetType, time.Now(), id)
	if err != nil {
		logger.Printf("exec failed: %v", err)
		return nil, err
	}
	resultAsset, err := GetAssetById(ctx, db, id)
	if err != nil {
		logger.Printf("get asset by name failed: %v", err)
		return nil, err
	}
	return resultAsset, err
}

func DeleteAssetById(ctx context.Context, db *sql.DB, id string) error {
	logger := log.GetReqLogger(ctx)
	query := fmt.Sprintf("UPDATE %s SET status = ? WHERE id = ?", TableAsset)
	_, err := db.ExecContext(ctx, query, StatusDeleted, id)
	if err != nil {
		logger.Printf("exec (id=%v) failed: %v", id, err)
		return err
	}
	return nil
}

func ListAsset(ctx context.Context, db *sql.DB, paginaton PaginationParams, filters []FilterCondition, orderBy []OrderByCondition) (*ByPage[Asset], error) {
	return QueryByPage[Asset](ctx, db, TableAsset, paginaton, filters, orderBy)
}

// GetProjectById get project with given id, returns `models.ErrNotExist` if it does not exist
func GetProjectById(ctx context.Context, db *sql.DB, id string) (*Project, error) {
	return GetById[Project](ctx, db, TableProject, id)
}

// GetProjectByName get project with given owner & name, returns `models.ErrNotExist` if it does not exist
func GetProjectByName(ctx context.Context, db *sql.DB, owner string, name string) (*Project, error) {
	logger := log.GetReqLogger(ctx)
	conditions := []FilterCondition{
		{Column: "owner", Operation: "=", Value: owner},
		{Column: "name", Operation: "=", Value: name},
	}
	results, err := querySelect[Project](ctx, db, TableProject, conditions)
	if err != nil {
		logger.Printf("querySelect failed: %v", err)
		return nil, err
	}
	if len(results) == 0 {
		logger.Printf("not exist")
		return nil, ErrNotExist
	}
	return &results[0], nil
}

// ensureProjectNotExist ensures that no project with given owner & name exists.
// If exists, ErrExisted is returned.
func ensureProjectNotExist(ctx context.Context, db *sql.DB, owner string, name string) error {
	logger := log.GetReqLogger(ctx)
	_, err := GetProjectByName(ctx, db, owner, name)
	if err == nil {
		logger.Printf("project with same owner & name (%s/%s) already existed", owner, name)
		return ErrExisted
	} else if err != ErrNotExist {
		logger.Printf("GetProjectByName failed: %v", err)
		return err
	}
	return nil
}

func AddProject(ctx context.Context, db *sql.DB, p *Project) (*Project, error) {
	logger := log.GetReqLogger(ctx)
	err := ensureProjectNotExist(ctx, db, p.Owner, p.Name)
	if err != nil {
		logger.Printf("ensureProjectNotExist failed: %v", err)
		return nil, err
	}
	now := time.Now()
	sqlStr := fmt.Sprintf("insert into %s (name, owner, is_public, files, version, status, c_time, u_time) values (?,?,?,?,?,?,?,?)", TableProject)
	res, err := db.ExecContext(ctx, sqlStr, p.Name, p.Owner, p.IsPublic, p.Files, p.Version, StatusNormal, now, now)
	if err != nil {
		logger.Printf("exec failed: %v", err)
		return nil, err
	}
	idInt, err := res.LastInsertId()
	if err != nil {
		logger.Printf("get last insert id failed: %v", err)
		return nil, err
	}
	resultProject, err := GetProjectById(ctx, db, strconv.Itoa(int(idInt)))
	if err != nil {
		logger.Printf("get project by id (%v) failed: %v", idInt, err)
		return nil, err
	}
	return resultProject, err
}

func UpdateProjectById(ctx context.Context, db *sql.DB, id string, updates *Project) (*Project, error) {
	logger := log.GetReqLogger(ctx)
	query := fmt.Sprintf("UPDATE %s SET is_public = ?, files = ?, version = ?, u_time = ? WHERE id = ?", TableProject)
	stmt, err := db.Prepare(query)
	if err != nil {
		logger.Printf("db prepare failed: %v", err)
		return nil, err
	}
	defer stmt.Close()
	_, err = stmt.ExecContext(ctx, updates.IsPublic, updates.Files, updates.Version, time.Now(), id)
	if err != nil {
		logger.Printf("exec failed: %v", err)
		return nil, err
	}
	resultProject, err := GetProjectById(ctx, db, id)
	if err != nil {
		logger.Printf("get project by name failed: %v", err)
		return nil, err
	}
	return resultProject, err
}

func DeleteProjectById(ctx context.Context, db *sql.DB, id string) error {
	logger := log.GetReqLogger(ctx)
	query := fmt.Sprintf("UPDATE %s SET status = ? WHERE id = ?", TableProject)
	_, err := db.ExecContext(ctx, query, StatusDeleted, id)
	if err != nil {
		logger.Printf("exec (%s) failed: %v", id, err)
		return err
	}
	return nil
}

func ListProject(ctx context.Context, db *sql.DB, paginaton PaginationParams, filters []FilterCondition, orderBy []OrderByCondition) (*ByPage[Project], error) {
	return QueryByPage[Project](ctx, db, TableProject, paginaton, filters, orderBy)
}
