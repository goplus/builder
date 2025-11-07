package controller

import (
	"context"
	"fmt"
	"regexp"
	"strconv"

	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/model"
)

// CourseSeriesDTO is the DTO for course series.
type CourseSeriesDTO struct {
	ModelDTO

	Owner       string   `json:"owner"`
	Title       string   `json:"title"`
	Thumbnail   string   `json:"thumbnail"`
	Description string   `json:"description"`
	CourseIDs   []string `json:"courseIDs"`
	Order       int      `json:"order"`
}

// toCourseSeriesDTO converts the model course series to its DTO.
func toCourseSeriesDTO(mCourseSeries model.CourseSeries) CourseSeriesDTO {
	courseIDs := make([]string, len(mCourseSeries.CourseIDs))
	for i, id := range mCourseSeries.CourseIDs {
		courseIDs[i] = strconv.FormatInt(id, 10)
	}
	return CourseSeriesDTO{
		ModelDTO:    toModelDTO(mCourseSeries.Model),
		Owner:       mCourseSeries.Owner.Username,
		Title:       mCourseSeries.Title,
		Thumbnail:   mCourseSeries.Thumbnail,
		Description: mCourseSeries.Description,
		CourseIDs:   courseIDs,
		Order:       mCourseSeries.Order,
	}
}

// courseSeriesTitleRE is the regular expression for course series title.
var courseSeriesTitleRE = regexp.MustCompile(`^.{1,200}$`)

// ensureCourseSeries ensures the course series exists and the user has access to it.
func (ctrl *Controller) ensureCourseSeries(ctx context.Context, id int64, ownedOnly bool) (*model.CourseSeries, error) {
	var mCourseSeries model.CourseSeries
	if err := ctrl.db.WithContext(ctx).
		Preload("Owner").
		Where("id = ?", id).
		First(&mCourseSeries).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get course series: %w", err)
	}

	if ownedOnly {
		if _, err := authn.EnsureUser(ctx, mCourseSeries.OwnerID); err != nil {
			return nil, err
		}
	}

	return &mCourseSeries, nil
}

// CreateCourseSeriesParams holds parameters for creating a course series.
type CreateCourseSeriesParams struct {
	Title       string   `json:"title"`
	Thumbnail   string   `json:"thumbnail"`
	Description string   `json:"description"`
	CourseIDs   []string `json:"courseIDs"`
	Order       int      `json:"order"`
}

// Validate validates the parameters.
func (p *CreateCourseSeriesParams) Validate() (ok bool, msg string) {
	if p.Title == "" {
		return false, "missing title"
	} else if !courseSeriesTitleRE.Match([]byte(p.Title)) {
		return false, "invalid title"
	}
	if p.CourseIDs == nil {
		p.CourseIDs = []string{}
	}
	return true, ""
}

// adaptCourseIDs converts a slice of course ID strings to a CourseIDCollection.
func adaptCourseIDs(courseIDStrs []string) model.CourseIDCollection {
	courseIDs := make([]int64, len(courseIDStrs))
	for i, id := range courseIDStrs {
		if id, err := strconv.ParseInt(id, 10, 64); err == nil {
			courseIDs[i] = id
		}
	}
	return model.CourseIDCollection(courseIDs)
}

// CreateCourseSeries creates a course series.
func (ctrl *Controller) CreateCourseSeries(ctx context.Context, params *CreateCourseSeriesParams) (*CourseSeriesDTO, error) {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return nil, authn.ErrUnauthorized
	}
	mCourseSeries := model.CourseSeries{
		OwnerID:     mUser.ID,
		Title:       params.Title,
		Thumbnail:   params.Thumbnail,
		Description: params.Description,
		CourseIDs:   adaptCourseIDs(params.CourseIDs),
		Order:       params.Order,
	}
	if err := ctrl.db.WithContext(ctx).Create(&mCourseSeries).Error; err != nil {
		return nil, fmt.Errorf("failed to create course series: %w", err)
	}
	if err := ctrl.db.WithContext(ctx).
		Preload("Owner").
		First(&mCourseSeries).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get course series: %w", err)
	}
	courseSeriesDTO := toCourseSeriesDTO(mCourseSeries)
	return &courseSeriesDTO, nil
}

// GetCourseSeries gets course series by id.
func (ctrl *Controller) GetCourseSeries(ctx context.Context, id string) (*CourseSeriesDTO, error) {
	mCourseSeriesID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid course series id: %w", err)
	}
	mCourseSeries, err := ctrl.ensureCourseSeries(ctx, mCourseSeriesID, false)
	if err != nil {
		return nil, err
	}
	courseSeriesDTO := toCourseSeriesDTO(*mCourseSeries)
	return &courseSeriesDTO, nil
}

// UpdateCourseSeriesParams holds parameters for updating a course series.
type UpdateCourseSeriesParams struct {
	Title       string   `json:"title"`
	Thumbnail   string   `json:"thumbnail"`
	Description string   `json:"description"`
	CourseIDs   []string `json:"courseIDs"`
	Order       int      `json:"order"`
}

// Validate validates the parameters.
func (p *UpdateCourseSeriesParams) Validate() (ok bool, msg string) {
	if p.Title == "" {
		return false, "missing title"
	} else if !courseSeriesTitleRE.Match([]byte(p.Title)) {
		return false, "invalid title"
	}
	if p.CourseIDs == nil {
		p.CourseIDs = []string{}
	}
	return true, ""
}

// Diff returns the updates between the parameters and the model course series.
func (p *UpdateCourseSeriesParams) Diff(mCourseSeries *model.CourseSeries) map[string]any {
	updates := map[string]any{}
	if p.Title != mCourseSeries.Title {
		updates["title"] = p.Title
	}
	if p.Thumbnail != mCourseSeries.Thumbnail {
		updates["thumbnail"] = p.Thumbnail
	}
	if p.Description != mCourseSeries.Description {
		updates["description"] = p.Description
	}
	pCourseIDs := adaptCourseIDs(p.CourseIDs)
	if !courseIDsEqual(pCourseIDs, mCourseSeries.CourseIDs) {
		updates["course_ids"] = model.CourseIDCollection(pCourseIDs)
	}
	if p.Order != mCourseSeries.Order {
		updates["order"] = p.Order
	}
	return updates
}

// courseIDsEqual compares two course ID collections for equality.
func courseIDsEqual(a, b model.CourseIDCollection) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

// UpdateCourseSeries updates a course series.
func (ctrl *Controller) UpdateCourseSeries(ctx context.Context, id string, params *UpdateCourseSeriesParams) (*CourseSeriesDTO, error) {
	mCourseSeriesID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid course series id: %w", err)
	}
	mCourseSeries, err := ctrl.ensureCourseSeries(ctx, mCourseSeriesID, true)
	if err != nil {
		return nil, err
	}
	updates := params.Diff(mCourseSeries)
	if len(updates) > 0 {
		if err := ctrl.db.WithContext(ctx).Model(mCourseSeries).Omit("Owner").Updates(updates).Error; err != nil {
			return nil, fmt.Errorf("failed to update course series: %w", err)
		}
	}
	courseSeriesDTO := toCourseSeriesDTO(*mCourseSeries)
	return &courseSeriesDTO, nil
}

// DeleteCourseSeries deletes a course series.
func (ctrl *Controller) DeleteCourseSeries(ctx context.Context, id string) error {
	mCourseSeriesID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid course series id: %w", err)
	}
	mCourseSeries, err := ctrl.ensureCourseSeries(ctx, mCourseSeriesID, true)
	if err != nil {
		return err
	}
	if err := ctrl.db.WithContext(ctx).Delete(mCourseSeries).Error; err != nil {
		return fmt.Errorf("failed to delete course series: %w", err)
	}
	return nil
}

// ListCourseSeriesOrderBy is the order by condition for listing course series.
type ListCourseSeriesOrderBy string

const (
	ListCourseSeriesOrderByCreatedAt ListCourseSeriesOrderBy = "createdAt"
	ListCourseSeriesOrderByUpdatedAt ListCourseSeriesOrderBy = "updatedAt"
	ListCourseSeriesOrderByOrder     ListCourseSeriesOrderBy = "order"
)

// IsValid reports whether the order by condition is valid.
func (ob ListCourseSeriesOrderBy) IsValid() bool {
	switch ob {
	case ListCourseSeriesOrderByCreatedAt,
		ListCourseSeriesOrderByUpdatedAt,
		ListCourseSeriesOrderByOrder:
		return true
	}
	return false
}

// ListCourseSeriesParams holds parameters for listing course series.
type ListCourseSeriesParams struct {
	// Owner filters course series by the owner's username.
	//
	// Applied only if non-nil.
	Owner *string

	// OrderBy indicates the field by which to order the results.
	OrderBy ListCourseSeriesOrderBy

	// SortOrder indicates the order in which to sort the results.
	SortOrder SortOrder

	// Pagination is the pagination information.
	Pagination Pagination
}

// NewListCourseSeriesParams creates a new ListCourseSeriesParams.
func NewListCourseSeriesParams() *ListCourseSeriesParams {
	return &ListCourseSeriesParams{
		OrderBy:    ListCourseSeriesOrderByOrder,
		SortOrder:  SortOrderAsc,
		Pagination: Pagination{Index: 1, Size: 20},
	}
}

// Validate validates the parameters.
func (p *ListCourseSeriesParams) Validate() (ok bool, msg string) {
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

// ListCourseSeries lists course series.
func (ctrl *Controller) ListCourseSeries(ctx context.Context, params *ListCourseSeriesParams) (*ByPage[CourseSeriesDTO], error) {
	query := ctrl.db.WithContext(ctx).Model(&model.CourseSeries{})

	// Apply owner filter
	if params.Owner != nil {
		query = query.Joins("JOIN user ON user.id = course_series.owner_id").Where("user.username = ?", *params.Owner)
	}

	// Apply ordering
	var queryOrderByColumn string
	switch params.OrderBy {
	case ListCourseSeriesOrderByCreatedAt:
		queryOrderByColumn = "course_series.created_at"
	case ListCourseSeriesOrderByUpdatedAt:
		queryOrderByColumn = "course_series.updated_at"
	case ListCourseSeriesOrderByOrder:
		queryOrderByColumn = "course_series.order"
	}
	if queryOrderByColumn == "" {
		queryOrderByColumn = "course_series.order"
	}
	query = query.Order(fmt.Sprintf("%s %s, course_series.id", queryOrderByColumn, params.SortOrder))

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count course series: %w", err)
	}

	// Get paginated results
	var mCourseSeries []model.CourseSeries
	if err := query.
		Preload("Owner").
		Offset(params.Pagination.Offset()).
		Limit(params.Pagination.Size).
		Find(&mCourseSeries).
		Error; err != nil {
		return nil, fmt.Errorf("failed to list course series: %w", err)
	}

	// Convert to DTOs
	courseSeriesDTOs := make([]CourseSeriesDTO, len(mCourseSeries))
	for i, mCS := range mCourseSeries {
		courseSeriesDTOs[i] = toCourseSeriesDTO(mCS)
	}

	return &ByPage[CourseSeriesDTO]{
		Total: total,
		Data:  courseSeriesDTOs,
	}, nil
}
