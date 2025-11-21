package controller

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/model"
)

// CourseDTO is the DTO for courses.
type CourseDTO struct {
	ModelDTO

	Owner      string                    `json:"owner"`
	Title      string                    `json:"title"`
	Thumbnail  string                    `json:"thumbnail"`
	Entrypoint string                    `json:"entrypoint"`
	References model.ReferenceCollection `json:"references"`
	Prompt     string                    `json:"prompt"`
}

// toCourseDTO converts the model course to its DTO.
func toCourseDTO(mCourse model.Course) CourseDTO {
	return CourseDTO{
		ModelDTO:   toModelDTO(mCourse.Model),
		Owner:      mCourse.Owner.Username,
		Title:      mCourse.Title,
		Thumbnail:  mCourse.Thumbnail,
		Entrypoint: mCourse.Entrypoint,
		References: mCourse.References,
		Prompt:     mCourse.Prompt,
	}
}

// courseTitleRE is the regular expression for course title.
var courseTitleRE = regexp.MustCompile(`^.{1,200}$`)

// ensureCourse ensures the course exists and the user has access to it.
func (ctrl *Controller) ensureCourse(ctx context.Context, id int64, ownedOnly bool) (*model.Course, error) {
	var mCourse model.Course
	if err := ctrl.db.WithContext(ctx).
		Preload("Owner").
		Where("id = ?", id).
		First(&mCourse).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get course: %w", err)
	}

	if ownedOnly {
		if _, err := authn.EnsureUser(ctx, mCourse.OwnerID); err != nil {
			return nil, err
		}
	}

	return &mCourse, nil
}

// CreateCourseParams holds parameters for creating a course.
type CreateCourseParams struct {
	Title      string                    `json:"title"`
	Thumbnail  string                    `json:"thumbnail"`
	Entrypoint string                    `json:"entrypoint"`
	References model.ReferenceCollection `json:"references"`
	Prompt     string                    `json:"prompt"`
}

// Validate validates the parameters.
func (p *CreateCourseParams) Validate() (ok bool, msg string) {
	if p.Title == "" {
		return false, "missing title"
	} else if !courseTitleRE.Match([]byte(p.Title)) {
		return false, "invalid title"
	}
	if p.Thumbnail == "" {
		return false, "missing thumbnail"
	}
	if p.Entrypoint == "" {
		return false, "missing entrypoint"
	}
	return true, ""
}

// CreateCourse creates a course.
func (ctrl *Controller) CreateCourse(ctx context.Context, params *CreateCourseParams) (*CourseDTO, error) {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return nil, authn.ErrUnauthorized
	}

	mCourse := model.Course{
		OwnerID:    mUser.ID,
		Title:      params.Title,
		Thumbnail:  params.Thumbnail,
		Entrypoint: params.Entrypoint,
		References: params.References,
		Prompt:     params.Prompt,
	}
	if err := ctrl.db.WithContext(ctx).Create(&mCourse).Error; err != nil {
		return nil, fmt.Errorf("failed to create course: %w", err)
	}
	if err := ctrl.db.WithContext(ctx).
		Preload("Owner").
		First(&mCourse).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get course: %w", err)
	}
	courseDTO := toCourseDTO(mCourse)
	return &courseDTO, nil
}

// GetCourse gets course by id.
func (ctrl *Controller) GetCourse(ctx context.Context, id string) (*CourseDTO, error) {
	mCourseID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid course id: %w", err)
	}
	mCourse, err := ctrl.ensureCourse(ctx, mCourseID, false)
	if err != nil {
		return nil, err
	}
	courseDTO := toCourseDTO(*mCourse)
	return &courseDTO, nil
}

// ListCoursesOrderBy is the order by condition for listing courses.
type ListCoursesOrderBy string

const (
	ListCoursesOrderByCreatedAt              ListCoursesOrderBy = "createdAt"
	ListCoursesOrderByUpdatedAt              ListCoursesOrderBy = "updatedAt"
	ListCoursesOrderBySequenceInCourseSeries ListCoursesOrderBy = "sequenceInCourseSeries"
)

// IsValid reports whether the order by condition is valid.
func (ob ListCoursesOrderBy) IsValid() bool {
	switch ob {
	case ListCoursesOrderByCreatedAt,
		ListCoursesOrderByUpdatedAt,
		ListCoursesOrderBySequenceInCourseSeries:
		return true
	}
	return false
}

// ListCoursesParams holds parameters for listing courses.
type ListCoursesParams struct {
	// CourseSeriesID filters courses by the course series ID.
	//
	// Applied only if non-nil.
	CourseSeriesID *string

	// Owner filters courses by the owner's username.
	//
	// Applied only if non-nil.
	Owner *string

	// OrderBy indicates the field by which to order the results.
	OrderBy ListCoursesOrderBy

	// SortOrder indicates the order in which to sort the results.
	SortOrder SortOrder

	// Pagination is the pagination information.
	Pagination Pagination
}

// NewListCoursesParams creates a new ListCoursesParams.
func NewListCoursesParams() *ListCoursesParams {
	return &ListCoursesParams{
		OrderBy:    ListCoursesOrderByCreatedAt,
		SortOrder:  SortOrderAsc,
		Pagination: Pagination{Index: 1, Size: 20},
	}
}

// Validate validates the parameters.
func (p *ListCoursesParams) Validate() (ok bool, msg string) {
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

// ListCourses lists courses.
func (ctrl *Controller) ListCourses(ctx context.Context, params *ListCoursesParams) (*ByPage[CourseDTO], error) {
	query := ctrl.db.WithContext(ctx).Model(&model.Course{})

	var courseIDs []int64
	if params.CourseSeriesID != nil {
		mCourseSeriesID, err := strconv.ParseInt(*params.CourseSeriesID, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("invalid course series id: %w", err)
		}
		mCourseSeries, err := ctrl.ensureCourseSeries(ctx, mCourseSeriesID, false)
		if err != nil {
			return nil, fmt.Errorf("failed to get course series: %w", err)
		}

		courseIDs = []int64(mCourseSeries.CourseIDs)
		if len(courseIDs) > 0 {
			query = query.Where("course.id IN ?", courseIDs)
		} else {
			return &ByPage[CourseDTO]{
				Total: 0,
				Data:  []CourseDTO{},
			}, nil
		}
	}

	if params.Owner != nil {
		query = query.Joins("JOIN user ON user.id = course.owner_id").Where("user.username = ?", *params.Owner)
	}

	var queryOrderByColumn string
	switch params.OrderBy {
	case ListCoursesOrderByCreatedAt:
		queryOrderByColumn = "course.created_at"
	case ListCoursesOrderByUpdatedAt:
		queryOrderByColumn = "course.updated_at"
	case ListCoursesOrderBySequenceInCourseSeries:
		if len(courseIDs) > 0 {
			orderByClause := fmt.Sprintf("FIELD(course.id, %s)", joinInt64s(courseIDs))
			query = query.Order(fmt.Sprintf("%s %s", orderByClause, params.SortOrder))
		}
	default:
		queryOrderByColumn = "course.created_at"
	}
	if queryOrderByColumn != "" {
		query = query.Order(fmt.Sprintf("%s %s, course.id", queryOrderByColumn, params.SortOrder))
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count courses: %w", err)
	}

	var mCourses []model.Course
	if err := query.
		Preload("Owner").
		Offset(params.Pagination.Offset()).
		Limit(params.Pagination.Size).
		Find(&mCourses).
		Error; err != nil {
		return nil, fmt.Errorf("failed to list courses: %w", err)
	}
	courseDTOs := make([]CourseDTO, len(mCourses))
	for i, mCourse := range mCourses {
		courseDTOs[i] = toCourseDTO(mCourse)
	}
	return &ByPage[CourseDTO]{
		Total: total,
		Data:  courseDTOs,
	}, nil
}

// UpdateCourseParams holds parameters for updating a course.
type UpdateCourseParams struct {
	Title      string                    `json:"title"`
	Thumbnail  string                    `json:"thumbnail"`
	Entrypoint string                    `json:"entrypoint"`
	References model.ReferenceCollection `json:"references"`
	Prompt     string                    `json:"prompt"`
}

// Validate validates the parameters.
func (p *UpdateCourseParams) Validate() (ok bool, msg string) {
	if p.Title == "" {
		return false, "missing title"
	} else if !courseTitleRE.Match([]byte(p.Title)) {
		return false, "invalid title"
	}
	if p.Thumbnail == "" {
		return false, "missing thumbnail"
	}
	if p.Entrypoint == "" {
		return false, "missing entrypoint"
	}
	return true, ""
}

// Diff returns the updates between the parameters and the model course.
func (p *UpdateCourseParams) Diff(mCourse *model.Course) map[string]any {
	updates := map[string]any{}
	if p.Title != mCourse.Title {
		updates["title"] = p.Title
	}
	if p.Thumbnail != mCourse.Thumbnail {
		updates["thumbnail"] = p.Thumbnail
	}
	if p.Entrypoint != mCourse.Entrypoint {
		updates["entrypoint"] = p.Entrypoint
	}
	if !referencesEqual(p.References, mCourse.References) {
		updates["references"] = p.References
	}
	if p.Prompt != mCourse.Prompt {
		updates["prompt"] = p.Prompt
	}
	return updates
}

// referencesEqual compares two reference collections for equality.
func referencesEqual(a, b model.ReferenceCollection) bool {
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

// UpdateCourse updates a course.
func (ctrl *Controller) UpdateCourse(ctx context.Context, id string, params *UpdateCourseParams) (*CourseDTO, error) {
	mCourseID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid course id: %w", err)
	}
	mCourse, err := ctrl.ensureCourse(ctx, mCourseID, true)
	if err != nil {
		return nil, err
	}
	updates := params.Diff(mCourse)
	if len(updates) > 0 {
		if err := ctrl.db.WithContext(ctx).Model(mCourse).Omit("Owner").Updates(updates).Error; err != nil {
			return nil, fmt.Errorf("failed to update course: %w", err)
		}
	}
	courseDTO := toCourseDTO(*mCourse)
	return &courseDTO, nil
}

// DeleteCourse deletes a course.
func (ctrl *Controller) DeleteCourse(ctx context.Context, id string) error {
	mCourseID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid course id: %w", err)
	}
	mCourse, err := ctrl.ensureCourse(ctx, mCourseID, true)
	if err != nil {
		return err
	}
	if err := ctrl.db.WithContext(ctx).Delete(mCourse).Error; err != nil {
		return fmt.Errorf("failed to delete course: %w", err)
	}
	return nil
}

func joinInt64s(nums []int64) string {
	if len(nums) == 0 {
		return ""
	}
	str := make([]string, len(nums))
	for i, num := range nums {
		str[i] = strconv.FormatInt(num, 10)
	}
	return strings.Join(str, ",")
}
