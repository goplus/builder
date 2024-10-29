package controller

import (
	"context"
	"database/sql"
	"fmt"
	"regexp"

	"github.com/goplus/builder/spx-backend/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ProjectReleaseDTO is the DTO for project releases.
type ProjectReleaseDTO struct {
	ModelDTO

	ProjectFullName string               `json:"projectFullName"`
	Name            string               `json:"name"`
	Description     string               `json:"description"`
	Files           model.FileCollection `json:"files"`
	Thumbnail       string               `json:"thumbnail"`
	RemixCount      int64                `json:"remixCount"`
}

// toProjectReleaseDTO converts the model project release to its DTO.
func toProjectReleaseDTO(pr model.ProjectRelease) ProjectReleaseDTO {
	return ProjectReleaseDTO{
		ModelDTO: toModelDTO(pr.Model),
		ProjectFullName: fmt.Sprintf(
			"%s/%s",
			pr.Project.Owner.Username,
			pr.Project.Name,
		),
		Name:        pr.Name,
		Description: pr.Description,
		Files:       pr.Files,
		Thumbnail:   pr.Thumbnail,
		RemixCount:  pr.RemixCount,
	}
}

var (
	// projectReleaseNameRE is the regular expression for project release name.
	projectReleaseNameRE = regexp.MustCompile(`^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$`)

	// projectReleaseFullNameRE is the regular expression for project release full name.
	projectReleaseFullNameRE = regexp.MustCompile(`^([\w-]{1,100})\/([\w-]{1,100})\/(v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)))?$`)
)

// CreateProjectReleaseParams holds the parameters for creating a project release.
type CreateProjectReleaseParams struct {
	ProjectFullName string `json:"projectFullName"`
	Name            string `json:"name"`
	Description     string `json:"description"`
	Thumbnail       string `json:"thumbnail"`
}

// Validate validates the parameters.
func (p *CreateProjectReleaseParams) Validate() (ok bool, msg string) {
	if !projectFullNameRE.MatchString(p.ProjectFullName) {
		return false, "invalid projectFullName"
	}
	if !projectReleaseNameRE.MatchString(p.Name) {
		return false, "invalid projectReleaseName"
	}
	return true, ""
}

// CreateProjectRelease creates a project release.
func (ctrl *Controller) CreateProjectRelease(ctx context.Context, params *CreateProjectReleaseParams) (*ProjectReleaseDTO, error) {
	projectFullNameMatches := projectFullNameRE.FindStringSubmatch(params.ProjectFullName)
	projectOwnerUsername := projectFullNameMatches[1]
	projectName := projectFullNameMatches[2]

	mProject, err := ctrl.ensureProject(ctx, projectOwnerUsername, projectName, true)
	if err != nil {
		return nil, err
	}

	if params.Description == "" {
		params.Description = mProject.Description
	}
	if params.Thumbnail == "" {
		params.Thumbnail = mProject.Thumbnail
	}
	mProjectRelease := model.ProjectRelease{
		ProjectID:   mProject.ID,
		Name:        params.Name,
		Description: params.Description,
		Files:       mProject.Files,
		Thumbnail:   params.Thumbnail,
	}
	if err := ctrl.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(mProject).Error; err != nil {
			return err
		}

		if err := tx.Create(&mProjectRelease).Error; err != nil {
			return err
		}

		if err := tx.
			Model(&mProject).
			Omit("Owner", "RemixedFromRelease", "LatestRelease").
			Updates(map[string]any{
				"latest_release_id": sql.NullInt64{Int64: mProjectRelease.ID, Valid: true},
				"release_count":     gorm.Expr("release_count + 1"),
			}).
			Error; err != nil {
			return err
		}

		return nil
	}); err != nil {
		return nil, fmt.Errorf("failed to create project release: %w", err)
	}
	if err := ctrl.db.WithContext(ctx).
		Preload("Project.Owner").
		First(&mProjectRelease).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get project release: %w", err)
	}
	projectReleaseDTO := toProjectReleaseDTO(mProjectRelease)
	return &projectReleaseDTO, nil
}

// ListProjectReleasesOrderBy is the order by for listing project releases.
type ListProjectReleasesOrderBy string

const (
	ListProjectReleasesOrderByCreatedAt  ListProjectReleasesOrderBy = "createdAt"
	ListProjectReleasesOrderByUpdatedAt  ListProjectReleasesOrderBy = "updatedAt"
	ListProjectReleasesOrderByRemixCount ListProjectReleasesOrderBy = "remixCount"
)

// IsValid reports whether the order by condition is valid.
func (ob ListProjectReleasesOrderBy) IsValid() bool {
	switch ob {
	case ListProjectReleasesOrderByCreatedAt,
		ListProjectReleasesOrderByUpdatedAt,
		ListProjectReleasesOrderByRemixCount:
		return true
	}
	return false
}

// ListProjectReleasesParams holds the parameters for listing project releases.
type ListProjectReleasesParams struct {
	// ProjectFullName filters releases by the full name of the associated project.
	//
	// Applied only if non-nil.
	ProjectFullName *string

	// OrderBy indicates the field by which to order the results.
	OrderBy ListProjectReleasesOrderBy

	// SortOrder indicates the order in which to sort the results.
	SortOrder SortOrder

	// Pagination is the pagination information.
	Pagination Pagination
}

// NewListProjectReleasesParams creates a new ListProjectReleasesParams.
func NewListProjectReleasesParams() *ListProjectReleasesParams {
	return &ListProjectReleasesParams{
		OrderBy:    ListProjectReleasesOrderByCreatedAt,
		SortOrder:  SortOrderAsc,
		Pagination: Pagination{Index: 1, Size: 20},
	}
}

// Validate validates the parameters.
func (p *ListProjectReleasesParams) Validate() (ok bool, msg string) {
	if p.ProjectFullName != nil && !projectFullNameRE.MatchString(*p.ProjectFullName) {
		return false, "invalid projectFullName"
	}
	if !p.OrderBy.IsValid() {
		return false, "invalid orderBy"
	}
	if !p.SortOrder.IsValid() {
		return false, "invalid sortOrder"
	}
	if !p.Pagination.IsValid() {
		return false, "invalid pagination"
	}
	return true, ""
}

// ListProjectReleases lists project releases.
func (ctrl *Controller) ListProjectReleases(ctx context.Context, params *ListProjectReleasesParams) (*ByPage[ProjectReleaseDTO], error) {
	query := ctrl.db.WithContext(ctx).
		Model(&model.ProjectRelease{}).
		Joins("JOIN project ON project.id = project_release.project_id").
		Where("project.visibility = ?", model.VisibilityPublic)
	if params.ProjectFullName != nil {
		projectFullNameMatches := projectFullNameRE.FindStringSubmatch(*params.ProjectFullName)
		projectOwnerUsername := projectFullNameMatches[1]
		projectName := projectFullNameMatches[2]
		query = query.
			Joins("JOIN user AS project_owner ON project_owner.id = project.owner_id").
			Where("project_owner.username = ?", projectOwnerUsername).
			Where("project.name = ?", projectName)
	}
	var queryOrderByColumn string
	switch params.OrderBy {
	case ListProjectReleasesOrderByCreatedAt:
	case ListProjectReleasesOrderByUpdatedAt:
		queryOrderByColumn = "project_release.updated_at"
	case ListProjectReleasesOrderByRemixCount:
		queryOrderByColumn = "project_release.remix_count"
	}
	if queryOrderByColumn == "" {
		queryOrderByColumn = "project_release.created_at"
	}
	query = query.Order(fmt.Sprintf("%s %s, project_release.id", queryOrderByColumn, params.SortOrder))

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count project releases: %w", err)
	}

	var mProjectReleases []model.ProjectRelease
	if err := query.
		Preload("Project.Owner").
		Offset(params.Pagination.Offset()).
		Limit(params.Pagination.Size).
		Find(&mProjectReleases).
		Error; err != nil {
		return nil, fmt.Errorf("failed to list project releases: %w", err)
	}
	projectReleaseDTOs := make([]ProjectReleaseDTO, len(mProjectReleases))
	for i, mProjectRelease := range mProjectReleases {
		projectReleaseDTOs[i] = toProjectReleaseDTO(mProjectRelease)
	}
	return &ByPage[ProjectReleaseDTO]{
		Total: total,
		Data:  projectReleaseDTOs,
	}, nil
}

// GetProjectRelease gets a project release.
func (ctrl *Controller) GetProjectRelease(ctx context.Context, projectOwnerUsername, projectName, projectReleaseName string) (*ProjectReleaseDTO, error) {
	mProject, err := ctrl.ensureProject(ctx, projectOwnerUsername, projectName, false)
	if err != nil {
		return nil, err
	}

	var mProjectRelease model.ProjectRelease
	if err := ctrl.db.WithContext(ctx).
		Preload("Project.Owner").
		Where("project_id = ?", mProject.ID).
		Where("name = ?", projectReleaseName).
		First(&mProjectRelease).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get project release: %w", err)
	}
	projectReleaseDTO := toProjectReleaseDTO(mProjectRelease)
	return &projectReleaseDTO, nil
}
