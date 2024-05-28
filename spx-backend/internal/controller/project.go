package controller

import (
	"context"
	"regexp"

	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/model"
)

// projectNameRE is the regular expression for project name.
var projectNameRE = regexp.MustCompile(`^[\w-]{1,100}$`)

// ensureProject ensures the project exists and the user has access to it.
func (ctrl *Controller) ensureProject(ctx context.Context, owner, name string, ownedOnly bool) (*model.Project, error) {
	logger := log.GetReqLogger(ctx)

	project, err := model.ProjectByOwnerAndName(ctx, ctrl.db, owner, name)
	if err != nil {
		logger.Printf("failed to get project %s/%s: %v", owner, name, err)
		return nil, err
	}

	if ownedOnly || project.IsPublic == model.Personal {
		if _, err := EnsureUser(ctx, project.Owner); err != nil {
			return nil, err
		}
	}

	return project, nil
}

// GetProject gets project by owner and name.
func (ctrl *Controller) GetProject(ctx context.Context, owner, name string) (*model.Project, error) {
	return ctrl.ensureProject(ctx, owner, name, false)
}

// ListProjectsParams holds parameters for listing projects.
type ListProjectsParams struct {
	// Owner is the owner filter, applied only if non-nil.
	Owner *string

	// IsPublic is the visibility filter, applied only if non-nil.
	IsPublic *model.IsPublic

	// Pagination is the pagination information.
	Pagination model.Pagination
}

// Validate validates the parameters.
func (p *ListProjectsParams) Validate() (ok bool, msg string) {
	return true, ""
}

// ListProjects lists projects.
func (ctrl *Controller) ListProjects(ctx context.Context, params *ListProjectsParams) (*model.ByPage[model.Project], error) {
	logger := log.GetReqLogger(ctx)

	// Ensure non-owners can only see public projects.
	if user, ok := UserFromContext(ctx); !ok || params.Owner == nil || user.Name != *params.Owner {
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

	projects, err := model.ListProjects(ctx, ctrl.db, params.Pagination, wheres, nil)
	if err != nil {
		logger.Printf("failed to list project: %v", err)
		return nil, err
	}
	return projects, nil
}

// AddProjectParams holds parameters for adding project.
type AddProjectParams struct {
	Name     string               `json:"name"`
	Owner    string               `json:"owner"`
	Files    model.FileCollection `json:"files"`
	IsPublic model.IsPublic       `json:"isPublic"`
}

// Validate validates the parameters.
func (p *AddProjectParams) Validate() (ok bool, msg string) {
	if p.Name == "" {
		return false, "missing name"
	} else if !projectNameRE.Match([]byte(p.Name)) {
		return false, "invalid name"
	}
	if p.Owner == "" {
		return false, "missing owner"
	}
	switch p.IsPublic {
	case model.Personal, model.Public:
	default:
		return false, "invalid isPublic"
	}
	return true, ""
}

// AddProject adds a project.
func (ctrl *Controller) AddProject(ctx context.Context, params *AddProjectParams) (*model.Project, error) {
	logger := log.GetReqLogger(ctx)

	user, err := EnsureUser(ctx, params.Owner)
	if err != nil {
		return nil, err
	}

	project, err := model.AddProject(ctx, ctrl.db, &model.Project{
		Name:     params.Name,
		Owner:    user.Name,
		Version:  1,
		Files:    params.Files,
		IsPublic: params.IsPublic,
	})
	if err != nil {
		logger.Printf("failed to add project: %v", err)
		return nil, err
	}
	return project, nil
}

// UpdateProjectParams holds parameters for updating project.
type UpdateProjectParams struct {
	Files    model.FileCollection `json:"files"`
	IsPublic model.IsPublic       `json:"isPublic"`
}

// Validate validates the parameters.
func (p *UpdateProjectParams) Validate() (ok bool, msg string) {
	switch p.IsPublic {
	case model.Personal, model.Public:
	default:
		return false, "invalid isPublic"
	}
	return true, ""
}

// UpdateProject updates a project.
func (ctrl *Controller) UpdateProject(ctx context.Context, owner, name string, params *UpdateProjectParams) (*model.Project, error) {
	logger := log.GetReqLogger(ctx)

	project, err := ctrl.ensureProject(ctx, owner, name, true)
	if err != nil {
		return nil, err
	}

	updatedProject, err := model.UpdateProjectByID(ctx, ctrl.db, project.ID, &model.Project{
		Version:  project.Version + 1,
		Files:    params.Files,
		IsPublic: params.IsPublic,
	})
	if err != nil {
		logger.Printf("failed to update project: %v", err)
		return nil, err
	}
	return updatedProject, nil
}

// DeleteProject deletes a project.
func (ctrl *Controller) DeleteProject(ctx context.Context, owner, name string) error {
	logger := log.GetReqLogger(ctx)

	project, err := ctrl.ensureProject(ctx, owner, name, true)
	if err != nil {
		return err
	}

	if err := model.DeleteProjectByID(ctx, ctrl.db, project.ID); err != nil {
		logger.Printf("failed to delete project: %v", err)
		return err
	}
	return nil
}
