package controller

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"maps"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ProjectDTO is the DTO for projects.
type ProjectDTO struct {
	ModelDTO

	Owner                   string               `json:"owner"`
	RemixedFrom             *RemixSource         `json:"remixedFrom,omitempty"`
	LatestRelease           *ProjectReleaseDTO   `json:"latestRelease,omitempty"`
	Name                    string               `json:"name"`
	Version                 int                  `json:"version"`
	Files                   model.FileCollection `json:"files"`
	Visibility              model.Visibility     `json:"visibility"`
	Description             string               `json:"description"`
	Instructions            string               `json:"instructions"`
	Thumbnail               string               `json:"thumbnail"`
	ViewCount               int64                `json:"viewCount"`
	LikeCount               int64                `json:"likeCount"`
	ReleaseCount            int64                `json:"releaseCount"`
	RemixCount              int64                `json:"remixCount"`
	MobileKeyboardType      int                  `json:"mobileKeyboardType"`
	MobileKeyboardZoneToKey map[string]*string   `json:"mobileKeyboardZoneToKey,omitempty"`
}

// toProjectDTO converts the model project to its DTO.
func toProjectDTO(mProject model.Project) ProjectDTO {
	var remixedFrom *RemixSource
	if mProject.RemixedFromRelease != nil {
		remixedFrom = &RemixSource{
			Owner:   mProject.RemixedFromRelease.Project.Owner.Username,
			Project: mProject.RemixedFromRelease.Project.Name,
			Release: &mProject.RemixedFromRelease.Name,
		}
	}
	var latestRelease *ProjectReleaseDTO
	if mProject.LatestRelease != nil {
		lr := toProjectReleaseDTO(*mProject.LatestRelease)
		latestRelease = &lr
	}
	return ProjectDTO{
		ModelDTO:                toModelDTO(mProject.Model),
		Owner:                   mProject.Owner.Username,
		RemixedFrom:             remixedFrom,
		LatestRelease:           latestRelease,
		Name:                    mProject.Name,
		Version:                 mProject.Version,
		Files:                   mProject.Files,
		Visibility:              mProject.Visibility,
		Description:             mProject.Description,
		Instructions:            mProject.Instructions,
		Thumbnail:               mProject.Thumbnail,
		ViewCount:               mProject.ViewCount,
		LikeCount:               mProject.LikeCount,
		ReleaseCount:            mProject.ReleaseCount,
		RemixCount:              mProject.RemixCount,
		MobileKeyboardType:      mProject.MobileKeyboardType,
		MobileKeyboardZoneToKey: convertZoneToKeyMapping(mProject.MobileKeyboardZoneToKey),
	}
}

// Type conversion function that converts model's MobileKeyboardZoneToKeyMapping to DTO's map[string]*string
func convertZoneToKeyMapping(ztkm model.MobileKeyboardZoneToKeyMapping) map[string]*string {
	if ztkm == nil {
		return nil
	}
	result := make(map[string]*string)
	for zone, key := range ztkm {
		result[string(zone)] = key
	}
	return result
}

// projectNameRE is the regular expression for project name.
var projectNameRE = regexp.MustCompile(`^[\w-]{1,100}$`)

// ProjectFullName holds the full name of a project.
type ProjectFullName struct{ Owner, Project string }

// ParseProjectFullName parses the string representation of a project full name.
func ParseProjectFullName(s string) (ProjectFullName, error) {
	var pfn ProjectFullName
	return pfn, pfn.UnmarshalText([]byte(s))
}

// String implements [fmt.Stringer].
func (pfn ProjectFullName) String() string {
	text, _ := pfn.MarshalText()
	return string(text)
}

// MarshalText implements [encoding.TextMarshaler].
func (pfn ProjectFullName) MarshalText() ([]byte, error) {
	if pfn.Owner == "" || pfn.Project == "" {
		return []byte{}, nil
	}
	escapedOwner := url.PathEscape(pfn.Owner)
	escapedProject := url.PathEscape(pfn.Project)
	return fmt.Appendf(nil, "%s/%s", escapedOwner, escapedProject), nil
}

// UnmarshalText implements [encoding.TextUnmarshaler].
func (pfn *ProjectFullName) UnmarshalText(text []byte) error {
	parts := strings.Split(string(text), "/")
	if len(parts) != 2 {
		return fmt.Errorf("invalid project full name: %s", text)
	}

	escapedOwner := parts[0]
	owner, err := url.PathUnescape(escapedOwner)
	if err != nil {
		return fmt.Errorf("failed to unescape owner in project full name %q: %w", text, err)
	}

	escapedProject := parts[1]
	project, err := url.PathUnescape(escapedProject)
	if err != nil {
		return fmt.Errorf("failed to unescape project in project full name %q: %w", text, err)
	}

	pfn.Owner = owner
	pfn.Project = project
	return nil
}

// IsValid reports whether the project full name is valid.
func (pfn ProjectFullName) IsValid() bool {
	if pfn.Owner == "" || pfn.Project == "" {
		return false
	}
	return projectNameRE.MatchString(pfn.Project)
}

// RemixSource is the source of a remix. It's either a [ProjectFullName] or a
// [ProjectReleaseFullName] under the hood.
type RemixSource struct {
	Owner   string
	Project string
	Release *string
}

// ParseRemixSource parses the string representation of a remix source.
func ParseRemixSource(s string) (RemixSource, error) {
	var rs RemixSource
	return rs, rs.UnmarshalText([]byte(s))
}

// String implements [fmt.Stringer].
func (rs RemixSource) String() string {
	text, _ := rs.MarshalText()
	return string(text)
}

// MarshalText implements [encoding.TextMarshaler].
func (rs RemixSource) MarshalText() ([]byte, error) {
	pfn := ProjectFullName{
		Owner:   rs.Owner,
		Project: rs.Project,
	}
	if rs.Release != nil {
		return ProjectReleaseFullName{
			ProjectFullName: pfn,
			Release:         *rs.Release,
		}.MarshalText()
	}
	return pfn.MarshalText()
}

// UnmarshalText implements [encoding.TextUnmarshaler].
func (rs *RemixSource) UnmarshalText(data []byte) error {
	if strings.Count(string(data), "/") == 2 {
		var prfn ProjectReleaseFullName
		if err := prfn.UnmarshalText(data); err != nil {
			return err
		}
		rs.Owner = prfn.Owner
		rs.Project = prfn.Project
		rs.Release = &prfn.Release
	} else {
		var pfn ProjectFullName
		if err := pfn.UnmarshalText(data); err != nil {
			return err
		}
		rs.Owner = pfn.Owner
		rs.Project = pfn.Project
	}
	return nil
}

// IsValid reports whether the remix source is valid.
func (rs RemixSource) IsValid() bool {
	pfn := ProjectFullName{
		Owner:   rs.Owner,
		Project: rs.Project,
	}
	if rs.Release != nil {
		return ProjectReleaseFullName{
			ProjectFullName: pfn,
			Release:         *rs.Release,
		}.IsValid()
	}
	return pfn.IsValid()
}

// ensureProject ensures the project exists and the user has access to it.
func (ctrl *Controller) ensureProject(ctx context.Context, fullName ProjectFullName, ownedOnly bool) (*model.Project, error) {
	var mProject model.Project
	if err := ctrl.db.WithContext(ctx).
		Preload("Owner").
		Preload("RemixedFromRelease.Project.Owner").
		Preload("LatestRelease.Project.Owner").
		Joins("JOIN user ON user.id = project.owner_id").
		Where("user.username = ?", fullName.Owner).
		Where("project.name = ?", fullName.Project).
		First(&mProject).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get project %q: %w", fullName, err)
	}

	if ownedOnly || mProject.Visibility == model.VisibilityPrivate {
		if _, err := authn.EnsureUser(ctx, mProject.OwnerID); err != nil {
			return nil, err
		}
	}

	return &mProject, nil
}

// CreateProjectParams holds parameters for creating project.
type CreateProjectParams struct {
	RemixSource             *RemixSource         `json:"remixSource"`
	Name                    string               `json:"name"`
	Files                   model.FileCollection `json:"files"`
	Visibility              model.Visibility     `json:"visibility"`
	Description             string               `json:"description"`
	Instructions            string               `json:"instructions"`
	Thumbnail               string               `json:"thumbnail"`
	MobileKeyboardType      int                  `json:"mobileKeyboardType"`
	MobileKeyboardZoneToKey map[string]*string   `json:"mobileKeyboardZoneToKey,omitempty"`
}

// Validate validates the parameters.
func (p *CreateProjectParams) Validate() (ok bool, msg string) {
	if p.RemixSource != nil && !p.RemixSource.IsValid() {
		return false, "invalid remixSource"
	}
	if p.Name == "" {
		return false, "missing name"
	} else if !projectNameRE.Match([]byte(p.Name)) {
		return false, "invalid name"
	}
	if p.MobileKeyboardType < 1 || p.MobileKeyboardType > 2 {
		return false, "invalid mobileKeyboardType, must be 1 (no keyboard) or 2 (custom keyboard)"
	}
	if p.MobileKeyboardType == 2 && len(p.MobileKeyboardZoneToKey) == 0 {
		return false, "mobileKeyboardZoneToKey is required when mobileKeyboardType is 2 (custom keyboard)"
	}
	if p.MobileKeyboardType == 1 && len(p.MobileKeyboardZoneToKey) > 0 {
		return false, "mobileKeyboardZoneToKey must be empty when mobileKeyboardType is 1 (no keyboard)"
	}
	if p.MobileKeyboardType == 2 && p.MobileKeyboardZoneToKey != nil {
		for zoneStr := range p.MobileKeyboardZoneToKey {
			zone := model.MobileKeyboardZoneId(zoneStr)
			if !zone.IsValid() {
				return false, fmt.Sprintf("invalid zone ID: %s", zoneStr)
			}
		}
	}
	return true, ""
}

// CreateProject creates a project.
func (ctrl *Controller) CreateProject(ctx context.Context, params *CreateProjectParams) (*ProjectDTO, error) {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return nil, authn.ErrUnauthorized
	}

	mProject := model.Project{
		OwnerID:                 mUser.ID,
		Name:                    params.Name,
		Version:                 1,
		Files:                   params.Files,
		Visibility:              params.Visibility,
		Description:             params.Description,
		Instructions:            params.Instructions,
		Thumbnail:               params.Thumbnail,
		MobileKeyboardType:      params.MobileKeyboardType,
		MobileKeyboardZoneToKey: convertToModelZoneToKeyMapping(params.MobileKeyboardZoneToKey),
	}
	if params.RemixSource != nil {
		var mRemixSourceProject model.Project
		if err := ctrl.db.WithContext(ctx).
			Joins("JOIN user ON user.id = project.owner_id").
			Where("user.username = ?", params.RemixSource.Owner).
			Where("project.name = ?", params.RemixSource.Project).
			First(&mRemixSourceProject).
			Error; err != nil {
			return nil, fmt.Errorf("failed to get project %q: %w", params.RemixSource, err)
		}
		if mRemixSourceProject.Visibility == model.VisibilityPrivate {
			return nil, ErrNotExist
		}

		releaseQuery := ctrl.db.WithContext(ctx).
			Model(&model.ProjectRelease{}).
			Where("project_id = ?", mRemixSourceProject.ID)
		if params.RemixSource.Release != nil {
			releaseQuery = releaseQuery.Where("name = ?", *params.RemixSource.Release)
		} else {
			releaseQuery = releaseQuery.Order("created_at DESC") // latest release
		}

		var mRemixSourceProjectRelease model.ProjectRelease
		if err := releaseQuery.First(&mRemixSourceProjectRelease).Error; err != nil {
			return nil, fmt.Errorf("failed to get release of project %q: %w", params.RemixSource, err)
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

		mUserStatisticalUpdates := map[string]any{
			"project_count": gorm.Expr("project_count + 1"),
		}
		if mProject.Visibility == model.VisibilityPublic {
			mUserStatisticalUpdates["public_project_count"] = gorm.Expr("public_project_count + 1")
		}
		if err := tx.Model(mUser).UpdateColumns(mUserStatisticalUpdates).Error; err != nil {
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
	RemixedFrom *RemixSource

	// Keyword filters projects by name pattern.
	//
	// Applied only if non-nil.
	Keyword *string

	// Visibility filters assets by visibility.
	//
	// Applied only if non-nil.
	Visibility *model.Visibility

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
	if p.RemixedFrom != nil && !p.RemixedFrom.IsValid() {
		return false, "invalid remixedFrom"
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
	mUser, ok := authn.UserFromContext(ctx)
	if !ok || (params.Owner != nil && *params.Owner != mUser.Username) {
		// Ensure non-owners can only see public projects.
		if params.Visibility == nil {
			public := model.VisibilityPublic
			params.Visibility = &public
		} else if *params.Visibility != model.VisibilityPublic {
			return nil, authn.ErrUnauthorized
		}
	}

	query := ctrl.db.WithContext(ctx).Model(&model.Project{})
	if params.Owner != nil {
		query = query.Joins("JOIN user ON user.id = project.owner_id").Where("user.username = ?", *params.Owner)
	}
	if params.RemixedFrom != nil {
		query = query.
			Joins("JOIN project_release ON project_release.id = project.remixed_from_release_id").
			Joins("JOIN project AS remixed_from_project ON remixed_from_project.id = project_release.project_id").
			Joins("JOIN user AS remixed_from_user ON remixed_from_user.id = remixed_from_project.owner_id").
			Where("remixed_from_user.username = ?", params.RemixedFrom.Owner).
			Where("remixed_from_project.name = ?", params.RemixedFrom.Project)
		if params.RemixedFrom.Release != nil {
			query = query.Where("project_release.name = ?", *params.RemixedFrom.Release)
		}
	}
	if params.Keyword != nil {
		query = query.Where("project.name LIKE ?", "%"+*params.Keyword+"%")
	}
	if params.Visibility != nil {
		query = query.Where("project.visibility = ?", *params.Visibility)
	} else if ok && params.Owner == nil {
		query = query.Where(ctrl.db.Where("project.owner_id = ?", mUser.ID).Or("project.visibility = ?", model.VisibilityPublic))
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
		if !ok {
			return nil, authn.ErrUnauthorized
		}
		query = query.
			Joins("JOIN user_relationship ON user_relationship.target_user_id = project.owner_id").
			Where("user_relationship.user_id = ?", mUser.ID).
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
func (ctrl *Controller) GetProject(ctx context.Context, fullName ProjectFullName) (*ProjectDTO, error) {
	mProject, err := ctrl.ensureProject(ctx, fullName, false)
	if err != nil {
		return nil, err
	}
	projectDTO := toProjectDTO(*mProject)
	return &projectDTO, nil
}

// UpdateProjectParams holds parameters for updating project.
type UpdateProjectParams struct {
	Files                   model.FileCollection `json:"files"`
	Visibility              model.Visibility     `json:"visibility"`
	Description             string               `json:"description"`
	Instructions            string               `json:"instructions"`
	Thumbnail               string               `json:"thumbnail"`
	MobileKeyboardType      int                  `json:"mobileKeyboardType"`
	MobileKeyboardZoneToKey map[string]*string   `json:"mobileKeyboardZoneToKey,omitempty"`
}

// Validate validates the parameters.
func (p *UpdateProjectParams) Validate() (ok bool, msg string) {
	// Validate mobile keyboard type
	if p.MobileKeyboardType < 1 || p.MobileKeyboardType > 2 {
		return false, "invalid mobileKeyboardType, must be 1 (no keyboard) or 2 (custom keyboard)"
	}

	// Validate consistency between keyboard type and zone mapping
	if p.MobileKeyboardType == 2 && len(p.MobileKeyboardZoneToKey) == 0 {
		return false, "mobileKeyboardZoneToKey is required when mobileKeyboardType is 2 (custom keyboard)"
	}
	if p.MobileKeyboardType == 1 && len(p.MobileKeyboardZoneToKey) > 0 {
		return false, "mobileKeyboardZoneToKey must be empty when mobileKeyboardType is 1 (no keyboard)"
	}

	// Validate if zone IDs are valid
	if p.MobileKeyboardType == 2 && p.MobileKeyboardZoneToKey != nil {
		for zoneStr := range p.MobileKeyboardZoneToKey {
			zone := model.MobileKeyboardZoneId(zoneStr)
			if !zone.IsValid() {
				return false, fmt.Sprintf("invalid zone ID: %s", zoneStr)
			}
		}
	}

	return true, ""
}

// Diff returns the updates between the parameters and the model project.
func (p *UpdateProjectParams) Diff(mProject *model.Project) map[string]any {
	updates := map[string]any{}
	if !maps.Equal(p.Files, mProject.Files) {
		updates["files"] = p.Files
	}
	if p.Visibility != mProject.Visibility {
		updates["visibility"] = p.Visibility
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
	if p.MobileKeyboardType != mProject.MobileKeyboardType {
		updates["mobile_keyboard_type"] = p.MobileKeyboardType
	}
	if !equalZoneToKeyMapping(p.MobileKeyboardZoneToKey, mProject.MobileKeyboardZoneToKey) {
		updates["mobile_keyboard_zone_to_key"] = convertToModelZoneToKeyMapping(p.MobileKeyboardZoneToKey)
	}
	return updates
}

// convertToModelZoneToKeyMapping converts DTO's map[string]*string to model's MobileKeyboardZoneToKeyMapping
func convertToModelZoneToKeyMapping(dtoMapping map[string]*string) model.MobileKeyboardZoneToKeyMapping {
	if dtoMapping == nil {
		return make(model.MobileKeyboardZoneToKeyMapping)
	}
	result := make(model.MobileKeyboardZoneToKeyMapping)
	for zoneStr, key := range dtoMapping {
		zone := model.MobileKeyboardZoneId(zoneStr)
		result[zone] = key
	}
	return result
}

// equalZoneToKeyMapping compares if two ZoneToKey mappings are equal
func equalZoneToKeyMapping(dtoMapping map[string]*string, modelMapping model.MobileKeyboardZoneToKeyMapping) bool {
	if len(dtoMapping) != len(modelMapping) {
		return false
	}

	for zoneStr, dtoKey := range dtoMapping {
		zone := model.MobileKeyboardZoneId(zoneStr)
		modelKey, exists := modelMapping[zone]
		if !exists {
			return false
		}

		// Compare the values pointed to by the pointers
		if (dtoKey == nil) != (modelKey == nil) {
			return false
		}
		if dtoKey != nil && modelKey != nil && *dtoKey != *modelKey {
			return false
		}
	}

	return true
}

// UpdateProject updates a project.
func (ctrl *Controller) UpdateProject(ctx context.Context, fullName ProjectFullName, params *UpdateProjectParams) (*ProjectDTO, error) {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return nil, authn.ErrUnauthorized
	}

	mProject, err := ctrl.ensureProject(ctx, fullName, true)
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

			mUserStatisticalUpdates := map[string]any{}
			if updates["visibility"] != nil {
				switch params.Visibility {
				case model.VisibilityPrivate:
					mUserStatisticalUpdates["public_project_count"] = gorm.Expr("public_project_count - 1")
				case model.VisibilityPublic:
					mUserStatisticalUpdates["public_project_count"] = gorm.Expr("public_project_count + 1")
				}
			}
			if len(mUserStatisticalUpdates) > 0 {
				if err := tx.Model(mUser).UpdateColumns(mUserStatisticalUpdates).Error; err != nil {
					return err
				}
			}

			return nil
		}); err != nil {
			return nil, fmt.Errorf("failed to update project %q: %w", fullName, err)
		}
	}
	projectDTO := toProjectDTO(*mProject)
	return &projectDTO, nil
}

// DeleteProject deletes a project.
func (ctrl *Controller) DeleteProject(ctx context.Context, fullName ProjectFullName) error {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return authn.ErrUnauthorized
	}

	mProject, err := ctrl.ensureProject(ctx, fullName, true)
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

		mUserStatisticalUpdates := map[string]any{
			"project_count": gorm.Expr("project_count - 1"),
		}
		if mProject.Visibility == model.VisibilityPublic {
			mUserStatisticalUpdates["public_project_count"] = gorm.Expr("public_project_count - 1")
		}
		if err := tx.Model(mUser).UpdateColumns(mUserStatisticalUpdates).Error; err != nil {
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
		return fmt.Errorf("failed to delete project %q: %w", fullName, err)
	}
	return nil
}

// RecordProjectView records a view for the specified project as the authenticated user.
func (ctrl *Controller) RecordProjectView(ctx context.Context, fullName ProjectFullName) error {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return authn.ErrUnauthorized
	}

	var mProject model.Project
	if err := ctrl.db.WithContext(ctx).
		Joins("JOIN user ON user.id = project.owner_id").
		Where("user.username = ?", fullName.Owner).
		Where("project.name = ?", fullName.Project).
		First(&mProject).
		Error; err != nil {
		return fmt.Errorf("failed to get project %q: %w", fullName, err)
	}

	mUserProjectRelationship, err := model.FirstOrCreateUserProjectRelationship(ctx, ctrl.db, mUser.ID, mProject.ID)
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
		return fmt.Errorf("failed to record view for project %q: %w", fullName, err)
	}
	return nil
}

// LikeProject likes the specified project as the authenticated user.
func (ctrl *Controller) LikeProject(ctx context.Context, fullName ProjectFullName) error {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return authn.ErrUnauthorized
	}

	var mProject model.Project
	if err := ctrl.db.WithContext(ctx).
		Joins("JOIN user ON user.id = project.owner_id").
		Where("user.username = ?", fullName.Owner).
		Where("project.name = ?", fullName.Project).
		First(&mProject).
		Error; err != nil {
		return fmt.Errorf("failed to get project %q: %w", fullName, err)
	}

	mUserProjectRelationship, err := model.FirstOrCreateUserProjectRelationship(ctx, ctrl.db, mUser.ID, mProject.ID)
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
		if err := tx.Model(mUser).UpdateColumn("liked_project_count", gorm.Expr("liked_project_count + 1")).Error; err != nil {
			return err
		}
		if err := tx.Model(&mProject).UpdateColumn("like_count", gorm.Expr("like_count + 1")).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		return fmt.Errorf("failed to like project %q: %w", fullName, err)
	}
	return nil
}

// HasLikedProject checks if the authenticated user has liked the specified project.
func (ctrl *Controller) HasLikedProject(ctx context.Context, fullName ProjectFullName) (bool, error) {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return false, nil
	}

	var mProject model.Project
	if err := ctrl.db.WithContext(ctx).
		Joins("JOIN user ON user.id = project.owner_id").
		Where("user.username = ?", fullName.Owner).
		Where("project.name = ?", fullName.Project).
		First(&mProject).
		Error; err != nil {
		return false, fmt.Errorf("failed to get project %q: %w", fullName, err)
	}

	if err := ctrl.db.WithContext(ctx).
		Select("id").
		Where("user_id = ?", mUser.ID).
		Where("project_id = ?", mProject.ID).
		Where("liked_at IS NOT NULL").
		First(&model.UserProjectRelationship{}).
		Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, fmt.Errorf("failed to check if user %q has liked project %q: %w", mUser.Username, fullName, err)
	}
	return true, nil
}

// UnlikeProject unlikes the specified project as the authenticated user.
func (ctrl *Controller) UnlikeProject(ctx context.Context, fullName ProjectFullName) error {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return authn.ErrUnauthorized
	}

	var mProject model.Project
	if err := ctrl.db.WithContext(ctx).
		Joins("JOIN user ON user.id = project.owner_id").
		Where("user.username = ?", fullName.Owner).
		Where("project.name = ?", fullName.Project).
		First(&mProject).
		Error; err != nil {
		return fmt.Errorf("failed to get project %q: %w", fullName, err)
	}

	mUserProjectRelationship, err := model.FirstOrCreateUserProjectRelationship(ctx, ctrl.db, mUser.ID, mProject.ID)
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
		if err := tx.Model(mUser).UpdateColumn("liked_project_count", gorm.Expr("liked_project_count - 1")).Error; err != nil {
			return err
		}
		if err := tx.Model(&mProject).UpdateColumn("like_count", gorm.Expr("like_count - 1")).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		return fmt.Errorf("failed to unlike project %q: %w", fullName, err)
	}
	return nil
}
