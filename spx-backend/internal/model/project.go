package model

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/goplus/builder/spx-backend/internal/log"
)

// Project is the model for a project.
type Project struct {
	// ID is the globally unique identifier.
	ID string `db:"id" json:"id"`

	// CTime is the creation time.
	CTime time.Time `db:"c_time" json:"cTime"`

	// UTime is the last update time.
	UTime time.Time `db:"u_time" json:"uTime"`

	// Name is the project's name, unique for projects of the same owner.
	Name string `db:"name" json:"name"`

	// Owner is the name of the project owner.
	Owner string `db:"owner" json:"owner"`

	// Version is the project version.
	Version int `db:"version" json:"version"`

	// Files contains the project's files.
	Files FileCollection `db:"files" json:"files"`

	// IsPublic indicates if the project is public.
	IsPublic IsPublic `db:"is_public" json:"isPublic"`

	// Status indicates if the project is deleted.
	Status Status `db:"status" json:"status"`
}

// TableProject is the table name of [Project] in database.
const TableProject = "project"

// ProjectByID gets project with given id. Returns `ErrNotExist` if it does not exist.
func ProjectByID(ctx context.Context, db *sql.DB, id string) (*Project, error) {
	return QueryByID[Project](ctx, db, TableProject, id)
}

// ProjectByOwnerAndName gets project with given owner and name. Returns `ErrNotExist` if it does not exist
func ProjectByOwnerAndName(ctx context.Context, db *sql.DB, owner string, name string) (*Project, error) {
	where := []FilterCondition{
		{Column: "owner", Operation: "=", Value: owner},
		{Column: "name", Operation: "=", Value: name},
	}
	return QueryFirst[Project](ctx, db, TableProject, where, nil)
}

// ListProjects lists projects with given pagination, where conditions and order by conditions.
func ListProjects(ctx context.Context, db *sql.DB, paginaton Pagination, where []FilterCondition, orderBy []OrderByCondition) (*ByPage[Project], error) {
	return QueryByPage[Project](ctx, db, TableProject, paginaton, where, orderBy)
}

// AddProject adds a project.
func AddProject(ctx context.Context, db *sql.DB, p *Project) (*Project, error) {
	logger := log.GetReqLogger(ctx)

	if _, err := ProjectByOwnerAndName(ctx, db, p.Owner, p.Name); err == nil {
		return nil, ErrExist
	} else if !errors.Is(err, ErrNotExist) {
		logger.Printf("ProjectByOwnerAndName failed: %v", err)
		return nil, err
	}

	return Create(ctx, db, TableProject, p)
}

// UpdateProjectByID updates project with given id.
func UpdateProjectByID(ctx context.Context, db *sql.DB, id string, p *Project) (*Project, error) {
	logger := log.GetReqLogger(ctx)
	if err := UpdateByID(ctx, db, TableProject, id, p, "version", "files", "is_public"); err != nil {
		logger.Printf("UpdateByID failed: %v", err)
		return nil, err
	}
	return ProjectByID(ctx, db, id)
}

// DeleteProjectByID deletes project with given id.
func DeleteProjectByID(ctx context.Context, db *sql.DB, id string) error {
	return UpdateByID(ctx, db, TableProject, id, &Project{Status: StatusDeleted}, "status")
}
