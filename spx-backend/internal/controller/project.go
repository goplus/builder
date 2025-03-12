package controller

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"maps"
	"regexp"
	"strings"
	"time"

	"github.com/goplus/builder/spx-backend/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ProjectDTO is the DTO for projects.
type ProjectDTO struct {
	ModelDTO

	Owner         string               `json:"owner"`
	RemixedFrom   string               `json:"remixedFrom,omitempty"`
	LatestRelease *ProjectReleaseDTO   `json:"latestRelease,omitempty"`
	Name          string               `json:"name"`
	Version       int                  `json:"version"`
	Files         model.FileCollection `json:"files"`
	Visibility    string               `json:"visibility"`
	Description   string               `json:"description"`
	Instructions  string               `json:"instructions"`
	Thumbnail     string               `json:"thumbnail"`
	ViewCount     int64                `json:"viewCount"`
	LikeCount     int64                `json:"likeCount"`
	ReleaseCount  int64                `json:"releaseCount"`
	RemixCount    int64                `json:"remixCount"`
}

// toProjectDTO converts the model project to its DTO.
func toProjectDTO(mProject model.Project) ProjectDTO {
	var remixedFrom string
	if mProject.RemixedFromRelease != nil {
		remixedFrom = fmt.Sprintf(
			"%s/%s/%s",
			mProject.RemixedFromRelease.Project.Owner.Username,
			mProject.RemixedFromRelease.Project.Name,
			mProject.RemixedFromRelease.Name,
		)
	}
	var latestRelease *ProjectReleaseDTO
	if mProject.LatestRelease != nil {
		lr := toProjectReleaseDTO(*mProject.LatestRelease)
		latestRelease = &lr
	}
	return ProjectDTO{
		ModelDTO:      toModelDTO(mProject.Model),
		Owner:         mProject.Owner.Username,
		RemixedFrom:   remixedFrom,
		LatestRelease: latestRelease,
		Name:          mProject.Name,
		Version:       mProject.Version,
		Files:         mProject.Files,
		Visibility:    mProject.Visibility.String(),
		Description:   mProject.Description,
		Instructions:  mProject.Instructions,
		Thumbnail:     mProject.Thumbnail,
		ViewCount:     mProject.ViewCount,
		LikeCount:     mProject.LikeCount,
		ReleaseCount:  mProject.ReleaseCount,
		RemixCount:    mProject.RemixCount,
	}
}

var (
	// projectNameRE is the regular expression for project name.
	projectNameRE = regexp.MustCompile(`^[\w-]{1,100}$`)

	// projectFullNameRE is the regular expression for project full name.
	projectFullNameRE = regexp.MustCompile(`^([\w-]{1,100})\/([\w-]{1,100})$`)
)

// ensureProject ensures the project exists and the user has access to it.
func (ctrl *Controller) ensureProject(ctx context.Context, owner, name string, ownedOnly bool) (*model.Project, error) {
	var mProject model.Project
	if err := ctrl.db.WithContext(ctx).
		Preload("Owner").
		Preload("RemixedFromRelease.Project.Owner").
		Preload("LatestRelease.Project.Owner").
		Joins("JOIN user ON user.id = project.owner_id").
		Where("user.username = ?", owner).
		Where("project.name = ?", name).
		First(&mProject).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get project %s/%s: %w", owner, name, err)
	}

	if ownedOnly || mProject.Visibility == model.VisibilityPrivate {
		if _, err := ensureAuthedUser(ctx, mProject.OwnerID); err != nil {
			return nil, err
		}
	}

	return &mProject, nil
}

// CreateProjectParams holds parameters for creating project.
type CreateProjectParams struct {
	RemixSource  string               `json:"remixSource"`
	Name         string               `json:"name"`
	Files        model.FileCollection `json:"files"`
	Visibility   string               `json:"visibility"`
	Description  string               `json:"description"`
	Instructions string               `json:"instructions"`
	Thumbnail    string               `json:"thumbnail"`
	Hidden       int8                 `json:"hidden"`
}

// Validate validates the parameters.
func (p *CreateProjectParams) Validate() (ok bool, msg string) {
	if p.RemixSource != "" &&
		!projectFullNameRE.MatchString(p.RemixSource) &&
		!projectReleaseFullNameRE.MatchString(p.RemixSource) {
		return false, "invalid remixSource"
	}
	if p.Name == "" {
		return false, "missing name"
	} else if !projectNameRE.Match([]byte(p.Name)) {
		return false, "invalid name"
	}
	if model.ParseVisibility(p.Visibility).String() != p.Visibility {
		return false, "invalid visibility"
	}
	return true, ""
}

// CreateProject creates a project.
func (ctrl *Controller) CreateProject(ctx context.Context, params *CreateProjectParams) (*ProjectDTO, error) {
	mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
	if !isAuthed {
		return nil, ErrUnauthorized
	}

	mProject := model.Project{
		OwnerID:      mAuthedUser.ID,
		Name:         params.Name,
		Version:      1,
		Files:        params.Files,
		Visibility:   model.ParseVisibility(params.Visibility),
		Description:  params.Description,
		Instructions: params.Instructions,
		Thumbnail:    params.Thumbnail,
	}
	mProject.Hidden = params.Hidden
	if params.RemixSource != "" {
		parts := strings.Split(params.RemixSource, "/")
		ownerUsername := parts[0]
		projectName := parts[1]

		var mRemixSourceProject model.Project
		if err := ctrl.db.WithContext(ctx).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", ownerUsername).
			Where("project.name = ?", projectName).
			First(&mRemixSourceProject).
			Error; err != nil {
			return nil, fmt.Errorf("failed to get project %s/%s: %w", ownerUsername, projectName, err)
		}
		if mRemixSourceProject.Visibility == model.VisibilityPrivate {
			return nil, ErrNotExist
		}

		releaseQuery := ctrl.db.WithContext(ctx).
			Model(&model.ProjectRelease{}).
			Where("project_id = ?", mRemixSourceProject.ID)
		if len(parts) == 3 {
			releaseName := parts[2]
			releaseQuery = releaseQuery.Where("name = ?", releaseName)
		} else {
			releaseQuery = releaseQuery.Order("created_at DESC") // latest release
		}

		var mRemixSourceProjectRelease model.ProjectRelease
		if err := releaseQuery.First(&mRemixSourceProjectRelease).Error; err != nil {
			return nil, fmt.Errorf("failed to get release of project %s/%s: %w", ownerUsername, projectName, err)
		}

		mProject.RemixedFromReleaseID = sql.NullInt64{
			Int64: mRemixSourceProjectRelease.ID,
			Valid: true,
		}
		if len(mProject.Files) == 0 {
			mProject.Files = mRemixSourceProjectRelease.Files
		}
		if mProject.Thumbnail == "" {
			mProject.Thumbnail = mRemixSourceProjectRelease.Thumbnail
		}
		if mProject.Description == "" {
			mProject.Description = mRemixSourceProject.Description
		}
		if mProject.Instructions == "" {
			mProject.Instructions = mRemixSourceProject.Instructions
		}
	}
	if err := ctrl.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&mProject).Error; err != nil {
			return err
		}

		mAuthedUserStatisticalUpdates := map[string]any{
			"project_count": gorm.Expr("project_count + 1"),
		}
		if mProject.Visibility == model.VisibilityPublic {
			mAuthedUserStatisticalUpdates["public_project_count"] = gorm.Expr("public_project_count + 1")
		}
		if err := tx.Model(mAuthedUser).UpdateColumns(mAuthedUserStatisticalUpdates).Error; err != nil {
			return err
		}

		if mProject.RemixedFromReleaseID.Valid {
			if err := tx.
				Model(&model.ProjectRelease{}).
				Where("id = ?", mProject.RemixedFromReleaseID.Int64).
				UpdateColumn("remix_count", gorm.Expr("remix_count + 1")).
				Error; err != nil {
				return err
			}
			if err := tx.
				Model(&model.Project{}).
				Where("id = (?)", tx.Model(&model.ProjectRelease{}).
					Select("project_id").
					Where("id = ?", mProject.RemixedFromReleaseID.Int64)).
				UpdateColumn("remix_count", gorm.Expr("remix_count + 1")).
				Error; err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		return nil, fmt.Errorf("failed to create project: %w", err)
	}
	if err := ctrl.db.WithContext(ctx).
		Preload("Owner").
		Preload("RemixedFromRelease.Project.Owner").
		Preload("LatestRelease.Project.Owner").
		First(&mProject).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get project: %w", err)
	}
	projectDTO := toProjectDTO(mProject)
	return &projectDTO, nil
}

// ListProjectsOrderBy is the order by condition for listing projects.
type ListProjectsOrderBy string

const (
	ListProjectsOrderByCreatedAt        ListProjectsOrderBy = "createdAt"
	ListProjectsOrderByUpdatedAt        ListProjectsOrderBy = "updatedAt"
	ListProjectsOrderByLikeCount        ListProjectsOrderBy = "likeCount"
	ListProjectsOrderByRemixCount       ListProjectsOrderBy = "remixCount"
	ListProjectsOrderByRecentLikeCount  ListProjectsOrderBy = "recentLikeCount"
	ListProjectsOrderByRecentRemixCount ListProjectsOrderBy = "recentRemixCount"
	ListProjectsOrderByLikedAt          ListProjectsOrderBy = "likedAt"
)

// IsValid reports whether the order by condition is valid.
func (ob ListProjectsOrderBy) IsValid() bool {
	switch ob {
	case ListProjectsOrderByCreatedAt,
		ListProjectsOrderByUpdatedAt,
		ListProjectsOrderByLikeCount,
		ListProjectsOrderByRemixCount,
		ListProjectsOrderByRecentLikeCount,
		ListProjectsOrderByRecentRemixCount,
		ListProjectsOrderByLikedAt:
		return true
	}
	return false
}

// ListProjectsParams holds parameters for listing projects.
type ListProjectsParams struct {
	// Owner filters projects by the owner's username.
	//
	// Applied only if non-nil.
	Owner *string

	// RemixedFrom filters remixed projects by the full name of the source
	// project or project release.
	//
	// Applied only if non-nil.
	RemixedFrom *string

	// Keyword filters projects by name pattern.
	//
	// Applied only if non-nil.
	Keyword *string

	// Visibility filters assets by visibility.
	//
	// Applied only if non-nil.
	Visibility *string

	// Liked filters projects liked by the specified user.
	//
	// Applied only if non-nil.
	Liker *string

	// CreatedAfter filters projects created after this timestamp.
	//
	// Applied only if non-nil.
	CreatedAfter *time.Time

	// LikesReceivedAfter filters projects that gained new likes after this timestamp.
	//
	// Applied only if non-nil.
	LikesReceivedAfter *time.Time

	// RemixesReceivedAfter filters projects that were remixed after this timestamp.
	RemixesReceivedAfter *time.Time

	// FromFollowees indicates whether to include projects created by the
	// authenticated user's followees.
	//
	// Applied only if non-nil.
	FromFollowees *bool

	// OrderBy indicates the field by which to order the results.
	OrderBy ListProjectsOrderBy

	// SortOrder indicates the order in which to sort the results.
	SortOrder SortOrder

	// Pagination is the pagination information.
	Pagination Pagination
}

// NewListProjectsParams creates a new ListProjectsParams.
func NewListProjectsParams() *ListProjectsParams {
	return &ListProjectsParams{
		OrderBy:    ListProjectsOrderByCreatedAt,
		SortOrder:  SortOrderAsc,
		Pagination: Pagination{Index: 1, Size: 20},
	}
}

// Validate validates the parameters.
func (p *ListProjectsParams) Validate() (ok bool, msg string) {
	if p.RemixedFrom != nil &&
		!projectFullNameRE.MatchString(*p.RemixedFrom) &&
		!projectReleaseFullNameRE.MatchString(*p.RemixedFrom) {
		return false, "invalid remixedFrom"
	}
	if p.Visibility != nil && model.ParseVisibility(*p.Visibility).String() != *p.Visibility {
		return false, "invalid visibility"
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

// ListProjects lists projects.
func (ctrl *Controller) ListProjects(ctx context.Context, params *ListProjectsParams) (*ByPage[ProjectDTO], error) {
	mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
	if !isAuthed || (params.Owner != nil && *params.Owner != mAuthedUser.Username) {
		// Ensure non-owners can only see public projects.
		if params.Visibility == nil {
			public := model.VisibilityPublic.String()
			params.Visibility = &public
		} else if *params.Visibility != model.VisibilityPublic.String() {
			return nil, ErrUnauthorized
		}
	}

	query := ctrl.db.WithContext(ctx).Model(&model.Project{})

	query = query.Where("hidden = 0")

	if params.Owner != nil {
		query = query.Joins("JOIN user ON user.id = project.owner_id").Where("user.username = ?", *params.Owner)
	}
	if params.RemixedFrom != nil {
		parts := strings.Split(*params.RemixedFrom, "/")
		ownerUsername := parts[0]
		projectName := parts[1]
		query = query.
			Joins("JOIN project_release ON project_release.id = project.remixed_from_release_id").
			Joins("JOIN project AS remixed_from_project ON remixed_from_project.id = project_release.project_id").
			Joins("JOIN user AS remixed_from_user ON remixed_from_user.id = remixed_from_project.owner_id").
			Where("remixed_from_user.username = ?", ownerUsername).
			Where("remixed_from_project.name = ?", projectName)
		if len(parts) == 3 {
			releaseName := parts[2]
			query = query.Where("project_release.name = ?", releaseName)
		}
	}
	if params.Keyword != nil {
		query = query.Where("project.name LIKE ?", "%"+*params.Keyword+"%")
	}
	if params.Visibility != nil {
		query = query.Where("project.visibility = ?", model.ParseVisibility(*params.Visibility))
	} else if isAuthed && params.Owner == nil {
		query = query.Where(ctrl.db.Where("project.owner_id = ?", mAuthedUser.ID).Or("project.visibility = ?", model.VisibilityPublic))
	}
	if params.Liker != nil {
		query = query.
			Joins("JOIN user_project_relationship AS liker_relationship ON liker_relationship.project_id = project.id").
			Joins("JOIN user AS liker ON liker.id = liker_relationship.user_id").
			Where("liker.username = ?", *params.Liker).
			Where("liker_relationship.liked_at IS NOT NULL")
	}
	if params.CreatedAfter != nil {
		query = query.Where("project.created_at > ?", *params.CreatedAfter)
	}
	if params.LikesReceivedAfter != nil {
		query = query.
			Joins("JOIN user_project_relationship AS likes_after_relationship ON likes_after_relationship.project_id = project.id").
			Where("likes_after_relationship.liked_at > ?", *params.LikesReceivedAfter).
			Group("project.id")
	}
	if params.RemixesReceivedAfter != nil {
		query = query.
			Joins("JOIN project_release ON project_release.project_id = project.id").
			Joins("JOIN project AS remixed_project ON remixed_project.remixed_from_release_id = project_release.id").
			Where("remixed_project.created_at > ?", *params.RemixesReceivedAfter).
			Group("project.id")
	}
	if params.FromFollowees != nil && *params.FromFollowees {
		if !isAuthed {
			return nil, ErrUnauthorized
		}
		query = query.
			Joins("JOIN user_relationship ON user_relationship.target_user_id = project.owner_id").
			Where("user_relationship.user_id = ?", mAuthedUser.ID).
			Where("user_relationship.followed_at IS NOT NULL")
	}
	var queryOrderByColumn string
	switch params.OrderBy {
	case ListProjectsOrderByCreatedAt:
	case ListProjectsOrderByUpdatedAt:
		queryOrderByColumn = "project.updated_at"
	case ListProjectsOrderByLikeCount:
		queryOrderByColumn = "project.like_count"
	case ListProjectsOrderByRemixCount:
		queryOrderByColumn = "project.remix_count"
	case ListProjectsOrderByRecentLikeCount:
		if params.LikesReceivedAfter == nil {
			queryOrderByColumn = "project.like_count"
			break
		}
		queryOrderByColumn = "COUNT(likes_after_relationship.id)"
	case ListProjectsOrderByRecentRemixCount:
		if params.RemixesReceivedAfter == nil {
			queryOrderByColumn = "project.remix_count"
			break
		}
		queryOrderByColumn = "COUNT(remixed_project.id)"
	case ListProjectsOrderByLikedAt:
		if params.Liker == nil {
			break
		}
		queryOrderByColumn = "liker_relationship.liked_at"
	}
	if queryOrderByColumn == "" {
		queryOrderByColumn = "project.created_at"
	}
	query = query.Order(fmt.Sprintf("%s %s, project.id", queryOrderByColumn, params.SortOrder))

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count projects: %w", err)
	}

	var mProjects []model.Project
	if err := query.
		Preload("Owner").
		Preload("RemixedFromRelease.Project.Owner").
		Preload("LatestRelease.Project.Owner").
		Offset(params.Pagination.Offset()).
		Limit(params.Pagination.Size).
		Find(&mProjects).
		Error; err != nil {
		return nil, fmt.Errorf("failed to list projects: %w", err)
	}
	projectDTOs := make([]ProjectDTO, len(mProjects))
	for i, mProject := range mProjects {
		projectDTOs[i] = toProjectDTO(mProject)
	}
	return &ByPage[ProjectDTO]{
		Total: total,
		Data:  projectDTOs,
	}, nil
}

// GetProject gets project by owner and name.
func (ctrl *Controller) GetProject(ctx context.Context, owner, name string) (*ProjectDTO, error) {
	mProject, err := ctrl.ensureProject(ctx, owner, name, false)
	if err != nil {
		return nil, err
	}
	projectDTO := toProjectDTO(*mProject)
	return &projectDTO, nil
}

// UpdateProjectParams holds parameters for updating project.
type UpdateProjectParams struct {
	Files        model.FileCollection `json:"files"`
	Description  string               `json:"description"`
	Instructions string               `json:"instructions"`
	Thumbnail    string               `json:"thumbnail"`
	Hidden       int8                 `json:"hidden"`
	Visibility   string               `json:"visibility"`
}

// Validate validates the parameters.
func (p *UpdateProjectParams) Validate() (ok bool, msg string) {
	if model.ParseVisibility(p.Visibility).String() != p.Visibility {
		return false, "invalid visibility"
	}
	return true, ""
}

// Diff returns the updates between the parameters and the model project.
func (p *UpdateProjectParams) Diff(mProject *model.Project) map[string]any {
	updates := map[string]any{}
	if !maps.Equal(p.Files, mProject.Files) {
		updates["files"] = p.Files
	}
	if p.Description != mProject.Description {
		updates["description"] = p.Description
	}
	if p.Instructions != mProject.Instructions {
		updates["instructions"] = p.Instructions
	}
	if p.Thumbnail != mProject.Thumbnail {
		updates["thumbnail"] = p.Thumbnail
	}
	if p.Hidden != mProject.Hidden {
		updates["hidden"] = p.Hidden
	}
	if p.Visibility != mProject.Visibility.String() {
		updates["visibility"] = model.ParseVisibility(p.Visibility)
	}
	return updates
}

// UpdateProject updates a project.
func (ctrl *Controller) UpdateProject(ctx context.Context, owner, name string, params *UpdateProjectParams) (*ProjectDTO, error) {
	mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
	if !isAuthed {
		return nil, ErrUnauthorized
	}

	mProject, err := ctrl.ensureProject(ctx, owner, name, true)
	if err != nil {
		return nil, err
	}
	updates := params.Diff(mProject)
	if len(updates) > 0 {
		if err := ctrl.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(mProject).Error; err != nil {
				return err
			}
			updates = params.Diff(mProject)
			if len(updates) == 0 {
				return nil
			}

			if queryResult := tx.Model(mProject).Omit("Owner", "RemixedFromRelease", "LatestRelease").Updates(updates); queryResult.Error != nil {
				return queryResult.Error
			} else if queryResult.RowsAffected == 0 {
				return nil
			}

			mAuthedUserStatisticalUpdates := map[string]any{}
			if updates["visibility"] != nil {
				switch params.Visibility {
				case model.VisibilityPrivate.String():
					mAuthedUserStatisticalUpdates["public_project_count"] = gorm.Expr("public_project_count - 1")
				case model.VisibilityPublic.String():
					mAuthedUserStatisticalUpdates["public_project_count"] = gorm.Expr("public_project_count + 1")
				}
			}
			if len(mAuthedUserStatisticalUpdates) > 0 {
				if err := tx.Model(mAuthedUser).UpdateColumns(mAuthedUserStatisticalUpdates).Error; err != nil {
					return err
				}
			}

			return nil
		}); err != nil {
			return nil, fmt.Errorf("failed to update project: %w", err)
		}
	}
	projectDTO := toProjectDTO(*mProject)
	return &projectDTO, nil
}

// DeleteProject deletes a project.
func (ctrl *Controller) DeleteProject(ctx context.Context, owner, name string) error {
	mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
	if !isAuthed {
		return ErrUnauthorized
	}

	mProject, err := ctrl.ensureProject(ctx, owner, name, true)
	if err != nil {
		return err
	}
	if err := ctrl.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(mProject).Error; err != nil {
			return err
		}
		if mProject.DeletedAt.Valid {
			return nil
		}

		if err := tx.Delete(mProject).Error; err != nil {
			return err
		}

		mAuthedUserStatisticalUpdates := map[string]any{
			"project_count": gorm.Expr("project_count - 1"),
		}
		if mProject.Visibility == model.VisibilityPublic {
			mAuthedUserStatisticalUpdates["public_project_count"] = gorm.Expr("public_project_count - 1")
		}
		if err := tx.Model(mAuthedUser).UpdateColumns(mAuthedUserStatisticalUpdates).Error; err != nil {
			return err
		}

		if mProject.RemixedFromReleaseID.Valid {
			if err := tx.
				Model(&model.ProjectRelease{}).
				Where("id = ?", mProject.RemixedFromReleaseID.Int64).
				UpdateColumn("remix_count", gorm.Expr("remix_count - 1")).
				Error; err != nil {
				return err
			}
			if err := tx.
				Model(&model.Project{}).
				Where("id = (?)", tx.Model(&model.ProjectRelease{}).
					Select("project_id").
					Where("id = ?", mProject.RemixedFromReleaseID.Int64)).
				UpdateColumn("remix_count", gorm.Expr("remix_count - 1")).
				Error; err != nil {
				return err
			}
		}

		if err := tx.
			Model(&model.User{}).
			Where("id IN (?)", tx.Model(&model.UserProjectRelationship{}).
				Select("user_id").
				Where("project_id = ?", mProject.ID).
				Where("liked_at IS NOT NULL")).
			UpdateColumn("liked_project_count", gorm.Expr("liked_project_count - 1")).
			Error; err != nil {
			return err
		}
		if err := tx.
			Where("project_id = ?", mProject.ID).
			Delete(&model.UserProjectRelationship{}).
			Error; err != nil {
			return err
		}

		if err := tx.
			Model(&model.Project{}).
			Where("remixed_from_release_id IN (?)", tx.Model(&model.ProjectRelease{}).
				Select("id").
				Where("project_id = ?", mProject.ID)).
			Update("remixed_from_release_id", sql.NullInt64{}).
			Error; err != nil {
			return err
		}
		if err := tx.
			Where("project_id = ?", mProject.ID).
			Delete(&model.ProjectRelease{}).
			Error; err != nil {
			return err
		}

		return nil
	}); err != nil {
		return fmt.Errorf("failed to delete project: %w", err)
	}
	return nil
}

// RecordProjectView records a view for the specified project as the authenticated user.
func (ctrl *Controller) RecordProjectView(ctx context.Context, owner, name string) error {
	mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
	if !isAuthed {
		return ErrUnauthorized
	}

	var mProject model.Project
	if err := ctrl.db.WithContext(ctx).
		Joins("JOIN user ON user.id = project.owner_id").
		Where("user.username = ?", owner).
		Where("project.name = ?", name).
		First(&mProject).
		Error; err != nil {
		return fmt.Errorf("failed to get project %s/%s: %w", owner, name, err)
	}

	mUserProjectRelationship, err := model.FirstOrCreateUserProjectRelationship(ctx, ctrl.db, mAuthedUser.ID, mProject.ID)
	if err != nil {
		return err
	}
	if mUserProjectRelationship.LastViewedAt.Valid && time.Since(mUserProjectRelationship.LastViewedAt.Time) < time.Minute {
		// Ignore views within a minute.
		return nil
	}

	if err := ctrl.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		query := tx.Model(mUserProjectRelationship)
		if mUserProjectRelationship.LastViewedAt.Valid {
			query = query.Where("last_viewed_at = ?", mUserProjectRelationship.LastViewedAt)
		} else {
			query = query.Where("last_viewed_at IS NULL")
		}
		if queryResult := query.UpdateColumns(map[string]any{
			"view_count":     gorm.Expr("view_count + 1"),
			"last_viewed_at": sql.NullTime{Time: time.Now().UTC(), Valid: true},
		}); queryResult.Error != nil {
			return queryResult.Error
		} else if queryResult.RowsAffected == 0 {
			return nil
		}
		if err := tx.Model(&mProject).UpdateColumn("view_count", gorm.Expr("view_count + 1")).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		return fmt.Errorf("failed to record project view: %w", err)
	}
	return nil
}

// LikeProject likes the specified project as the authenticated user.
func (ctrl *Controller) LikeProject(ctx context.Context, owner, name string) error {
	mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
	if !isAuthed {
		return ErrUnauthorized
	}

	var mProject model.Project
	if err := ctrl.db.WithContext(ctx).
		Joins("JOIN user ON user.id = project.owner_id").
		Where("user.username = ?", owner).
		Where("project.name = ?", name).
		First(&mProject).
		Error; err != nil {
		return fmt.Errorf("failed to get project %s/%s: %w", owner, name, err)
	}

	mUserProjectRelationship, err := model.FirstOrCreateUserProjectRelationship(ctx, ctrl.db, mAuthedUser.ID, mProject.ID)
	if err != nil {
		return err
	}
	if mUserProjectRelationship.LikedAt.Valid {
		return nil
	}

	if err := ctrl.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if queryResult := tx.
			Model(mUserProjectRelationship).
			Where("liked_at IS NULL").
			Update("liked_at", sql.NullTime{Time: time.Now().UTC(), Valid: true}); queryResult.Error != nil {
			return queryResult.Error
		} else if queryResult.RowsAffected == 0 {
			return nil
		}
		if err := tx.Model(mAuthedUser).UpdateColumn("liked_project_count", gorm.Expr("liked_project_count + 1")).Error; err != nil {
			return err
		}
		if err := tx.Model(&mProject).UpdateColumn("like_count", gorm.Expr("like_count + 1")).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		return fmt.Errorf("failed to like project: %w", err)
	}
	return nil
}

// HasLikedProject checks if the authenticated user has liked the specified project.
func (ctrl *Controller) HasLikedProject(ctx context.Context, owner, name string) (bool, error) {
	mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
	if !isAuthed {
		return false, nil
	}

	var mProject model.Project
	if err := ctrl.db.WithContext(ctx).
		Joins("JOIN user ON user.id = project.owner_id").
		Where("user.username = ?", owner).
		Where("project.name = ?", name).
		First(&mProject).
		Error; err != nil {
		return false, fmt.Errorf("failed to get project %s/%s: %w", owner, name, err)
	}

	if err := ctrl.db.WithContext(ctx).
		Select("id").
		Where("user_id = ?", mAuthedUser.ID).
		Where("project_id = ?", mProject.ID).
		Where("liked_at IS NOT NULL").
		First(&model.UserProjectRelationship{}).
		Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, fmt.Errorf("failed to check if user %s has liked project %s/%s: %w", mAuthedUser.Username, owner, name, err)
	}
	return true, nil
}

// UnlikeProject unlikes the specified project as the authenticated user.
func (ctrl *Controller) UnlikeProject(ctx context.Context, owner, name string) error {
	mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
	if !isAuthed {
		return ErrUnauthorized
	}

	var mProject model.Project
	if err := ctrl.db.WithContext(ctx).
		Joins("JOIN user ON user.id = project.owner_id").
		Where("user.username = ?", owner).
		Where("project.name = ?", name).
		First(&mProject).
		Error; err != nil {
		return fmt.Errorf("failed to get project %s/%s: %w", owner, name, err)
	}

	mUserProjectRelationship, err := model.FirstOrCreateUserProjectRelationship(ctx, ctrl.db, mAuthedUser.ID, mProject.ID)
	if err != nil {
		return err
	}
	if !mUserProjectRelationship.LikedAt.Valid {
		return nil
	}

	if err := ctrl.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if queryResult := tx.
			Model(mUserProjectRelationship).
			Where("liked_at = ?", mUserProjectRelationship.LikedAt).
			Update("liked_at", sql.NullTime{}); queryResult.Error != nil {
			return queryResult.Error
		} else if queryResult.RowsAffected == 0 {
			return nil
		}
		if err := tx.Model(mAuthedUser).UpdateColumn("liked_project_count", gorm.Expr("liked_project_count - 1")).Error; err != nil {
			return err
		}
		if err := tx.Model(&mProject).UpdateColumn("like_count", gorm.Expr("like_count - 1")).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		return fmt.Errorf("failed to unlike project: %w", err)
	}
	return nil
}
