package controller

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"time"

	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// RecordingDTO is the DTO for recordings.
type RecordingDTO struct {
	ModelDTO
	Owner           string          `json:"owner"`
	ProjectFullName ProjectFullName `json:"projectFullName"`
	Title           string          `json:"title"`
	Description     string          `json:"description"`
	VideoURL        string          `json:"videoUrl"`
	ThumbnailURL    string          `json:"thumbnailUrl"`
	ViewCount       int64           `json:"viewCount"`
	LikeCount       int64           `json:"likeCount"`
}

// toRecordingDTO converts the model recording to its DTO.
func toRecordingDTO(mRecording model.Recording) RecordingDTO {
	return RecordingDTO{
		ModelDTO: toModelDTO(mRecording.Model),
		Owner:    mRecording.Owner.Username,
		ProjectFullName: ProjectFullName{
			Owner:   mRecording.Project.Owner.Username,
			Project: mRecording.Project.Name,
		},
		Title:        mRecording.Title,
		Description:  mRecording.Description,
		VideoURL:     mRecording.VideoURL,
		ThumbnailURL: mRecording.ThumbnailURL,
		ViewCount:    mRecording.ViewCount,
		LikeCount:    mRecording.LikeCount,
	}
}

// Add description validation rule
var recordingDescriptionRE = regexp.MustCompile(`^.{0,200}$`)

// Add title validation rule
var recordingTitleRE = regexp.MustCompile(`^.{1,20}$`)

// ensureRecording ensures the recording exists and the user has access to it.
func (ctrl *Controller) ensureRecording(ctx context.Context, id string, ownedOnly bool) (*model.Recording, error) {
	var mRecording model.Recording
	if err := ctrl.db.WithContext(ctx).
		Preload("Owner").
		Preload("Project.Owner").
		Where("id = ?", id).
		First(&mRecording).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get recording: %w", err)
	}

	if ownedOnly {
		if _, err := authn.EnsureUser(ctx, mRecording.OwnerID); err != nil {
			return nil, err
		}
	}

	return &mRecording, nil
}

// CreateRecordingParams holds parameters for creating a recording.
type CreateRecordingParams struct {
	ProjectFullName ProjectFullName `json:"projectFullName"`
	Title           string          `json:"title"`
	Description     string          `json:"description"`
	VideoURL        string          `json:"videoUrl"`
	ThumbnailURL    string          `json:"thumbnailUrl"`
}

// Validate validates the CreateRecordingParams.
func (p *CreateRecordingParams) Validate() (ok bool, msg string) {
	if !p.ProjectFullName.IsValid() {
		return false, "invalid projectFullName"
	}
	if p.Title == "" {
		return false, "missing title"
	} else if !recordingTitleRE.Match([]byte(p.Title)) {
		return false, "invalid title"
	}
	if p.VideoURL == "" {
		return false, "missing videoUrl"
	}
	if p.Description != "" && !recordingDescriptionRE.Match([]byte(p.Description)) {
		return false, "description must be between 0-200 characters"
	}
	return true, ""
}

// CreateRecording creates a new recording.
func (ctrl *Controller) CreateRecording(ctx context.Context, params *CreateRecordingParams) (*RecordingDTO, error) {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return nil, authn.ErrUnauthorized
	}

    mProject, err := ctrl.ensureProject(ctx, params.ProjectFullName, false)
	if err != nil {
		return nil, err
	}

	mRecording := model.Recording{
		OwnerID:      mUser.ID,
		ProjectID:    mProject.ID,
		Title:        params.Title,
		Description:  params.Description,
		VideoURL:     params.VideoURL,
		ThumbnailURL: params.ThumbnailURL,
	}

	if err := ctrl.db.WithContext(ctx).Create(&mRecording).Error; err != nil {
		return nil, fmt.Errorf("failed to create recording: %w", err)
	}

	if err := ctrl.db.WithContext(ctx).
		Preload("User").
		Preload("Project.Owner").
		First(&mRecording, mRecording.ID).Error; err != nil {
		return nil, fmt.Errorf("failed to load recording: %w", err)
	}

	recordingDTO := toRecordingDTO(mRecording)
	return &recordingDTO, nil
}

// GetRecording gets a recording by owner and name.
func (ctrl *Controller) GetRecording(ctx context.Context, id string) (*RecordingDTO, error) {
	recording, err := ctrl.ensureRecording(ctx, id, false)
	if err != nil {
		return nil, err
	}

	recordingDTO := toRecordingDTO(*recording)
	return &recordingDTO, nil
}

// DeleteRecording deletes a recording by owner and name.
func (ctrl *Controller) DeleteRecording(ctx context.Context, id string) error {
	_, ok := authn.UserFromContext(ctx)
	if !ok {
		return authn.ErrUnauthorized
	}

	recording, err := ctrl.ensureRecording(ctx, id, true) // ownedOnly=true
	if err != nil {
		return err
	}

	return ctrl.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(recording).Error; err != nil {
			return fmt.Errorf("failed to delete recording: %w", err)
		}

		if err := tx.Where("recording_id = ?", recording.ID).Delete(&model.UserRecordingRelationship{}).Error; err != nil {
			return fmt.Errorf("failed to delete user_recording_relationship: %w", err)
		}
		return nil
	})
}

// RecordRecordingView records a view for the specified recording as the authenticated user.
func (ctrl *Controller) RecordRecordingView(ctx context.Context, id string) error {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return authn.ErrUnauthorized
	}

	var mRecording model.Recording
	if err := ctrl.db.WithContext(ctx).
		Where("id = ?", id).
		First(&mRecording).
		Error; err != nil {
		return fmt.Errorf("failed to get recording %q: %w", id, err)
	}

	mUserRecordingRelationship, err := model.FirstOrCreateUserRecordingRelationship(ctx, ctrl.db, mUser.ID, mRecording.ID)
	if err != nil {
		return err
	}
	if mUserRecordingRelationship.LastViewedAt.Valid && time.Since(mUserRecordingRelationship.LastViewedAt.Time) < time.Minute {
		// Ignore views within a minute.
		return nil
	}

	if err := ctrl.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		query := tx.Model(mUserRecordingRelationship)
		if mUserRecordingRelationship.LastViewedAt.Valid {
			query = query.Where("last_viewed_at = ?", mUserRecordingRelationship.LastViewedAt)
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
		if err := tx.Model(&mRecording).UpdateColumn("view_count", gorm.Expr("view_count + 1")).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		return fmt.Errorf("failed to record view for recording %q: %w", id, err)
	}
	return nil
}

// LikeRecording likes the specified recording as the authenticated user.
func (ctrl *Controller) LikeRecording(ctx context.Context, id string) error {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return authn.ErrUnauthorized
	}

	var mRecording model.Recording
	if err := ctrl.db.WithContext(ctx).
		Where("id = ?", id).
		First(&mRecording).
		Error; err != nil {
		return fmt.Errorf("failed to get recording %q: %w", id, err)
	}

	mUserRecordingRelationship, err := model.FirstOrCreateUserRecordingRelationship(ctx, ctrl.db, mUser.ID, mRecording.ID)
	if err != nil {
		return err
	}
	if mUserRecordingRelationship.LikedAt.Valid {
		return nil // Already liked
	}

	if err := ctrl.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if queryResult := tx.
			Model(mUserRecordingRelationship).
			Where("liked_at IS NULL").
			UpdateColumn("liked_at", sql.NullTime{Time: time.Now().UTC(), Valid: true}); queryResult.Error != nil {
			return queryResult.Error
		} else if queryResult.RowsAffected == 0 {
			return nil
		}
		if err := tx.Model(&mRecording).UpdateColumn("like_count", gorm.Expr("like_count + 1")).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		return fmt.Errorf("failed to like recording %q: %w", id, err)
	}
	return nil
}

// UnlikeRecording unlikes the specified recording as the authenticated user.
func (ctrl *Controller) UnlikeRecording(ctx context.Context, id string) error {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return authn.ErrUnauthorized
	}

	var mRecording model.Recording
	if err := ctrl.db.WithContext(ctx).
		Where("id = ?", id).
		First(&mRecording).
		Error; err != nil {
		return fmt.Errorf("failed to get recording %q: %w", id, err)
	}

	mUserRecordingRelationship, err := model.FirstOrCreateUserRecordingRelationship(ctx, ctrl.db, mUser.ID, mRecording.ID)
	if err != nil {
		return err
	}
	if !mUserRecordingRelationship.LikedAt.Valid {
		return nil // Already not liked
	}

	if err := ctrl.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if queryResult := tx.
			Model(mUserRecordingRelationship).
			Where("liked_at IS NOT NULL").
			UpdateColumn("liked_at", sql.NullTime{}); queryResult.Error != nil {
			return queryResult.Error
		} else if queryResult.RowsAffected == 0 {
			return nil
		}
		if err := tx.Model(&mRecording).UpdateColumn("like_count", gorm.Expr("like_count - 1")).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		return fmt.Errorf("failed to unlike recording %q: %w", id, err)
	}
	return nil
}

// HasLikedRecording checks if the authenticated user is liking the specified recording.
func (ctrl *Controller) HasLikedRecording(ctx context.Context, id string) (bool, error) {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return false, nil // Not authenticated, so not liking
	}

	var mRecording model.Recording
	if err := ctrl.db.WithContext(ctx).
		Where("id = ?", id).
		First(&mRecording).
		Error; err != nil {
		return false, fmt.Errorf("failed to get recording %q: %w", id, err)
	}

	var mUserRecordingRelationship model.UserRecordingRelationship
	if err := ctrl.db.WithContext(ctx).
		Where("user_id = ?", mUser.ID).
		Where("recording_id = ?", mRecording.ID).
		Where("liked_at IS NOT NULL").
		First(&mUserRecordingRelationship).
		Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, fmt.Errorf("failed to check liking status: %w", err)
	}
	return true, nil
}

// ListRecordingsOrderBy defines the available order by options
type ListRecordingsOrderBy string

const (
	ListRecordingsOrderByCreatedAt ListRecordingsOrderBy = "createdAt"
	ListRecordingsOrderByUpdatedAt ListRecordingsOrderBy = "updatedAt"
	ListRecordingsOrderByViewCount ListRecordingsOrderBy = "viewCount"
	ListRecordingsOrderByLikeCount ListRecordingsOrderBy = "likeCount"
	ListRecordingsOrderByLikedAt   ListRecordingsOrderBy = "likedAt"
)

// IsValid reports whether the order by condition is valid.
func (ob ListRecordingsOrderBy) IsValid() bool {
	switch ob {
	case ListRecordingsOrderByCreatedAt,
		ListRecordingsOrderByUpdatedAt,
		ListRecordingsOrderByViewCount,
		ListRecordingsOrderByLikeCount,
		ListRecordingsOrderByLikedAt:
		return true
	}
	return false
}

// ListRecordingsParams holds parameters for listing recordings.
type ListRecordingsParams struct {
	// Owner filters recordings by owner username
	Owner *string

	// ProjectFullName filters recordings by associated project
	ProjectFullName *ProjectFullName

	// Keyword filters recordings by name or title
	Keyword *string

	// OrderBy specifies the field to order by
	OrderBy ListRecordingsOrderBy

	// SortOrder specifies the sort direction
	SortOrder SortOrder

	// Pagination is the pagination information
	Pagination Pagination

	// Liker filters recordings liked by the specified user
	Liker *string
}

// NewListRecordingsParams creates a new ListRecordingsParams with default values.
func NewListRecordingsParams() *ListRecordingsParams {
	return &ListRecordingsParams{
		OrderBy:    ListRecordingsOrderByCreatedAt,
		SortOrder:  SortOrderDesc,
		Pagination: Pagination{Index: 1, Size: 20},
	}
}

// Validate validates the ListRecordingsParams.
func (p *ListRecordingsParams) Validate() (ok bool, msg string) {
	if p.ProjectFullName != nil && !p.ProjectFullName.IsValid() {
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

// ListRecordings lists recordings with filtering and pagination.
func (ctrl *Controller) ListRecordings(ctx context.Context, params *ListRecordingsParams) (*ByPage[RecordingDTO], error) {
	mUser, _ := authn.UserFromContext(ctx)

	query := ctrl.db.WithContext(ctx).Model(&model.Recording{})

	if params.Owner != nil {
		query = query.Joins("JOIN user ON user.id = recording.user_id").
			Where("user.username = ?", *params.Owner)
	} else if mUser != nil && params.Liker == nil {
		// Default to current user's recordings if no owner specified and user is authenticated
		// BUT only if we're not filtering by liker
		query = query.Where("recording.user_id = ?", mUser.ID)
	}

	if params.Liker != nil {
		query = query.
			Joins("JOIN user_recording_relationship AS liker_relationship ON liker_relationship.recording_id = recording.id").
			Joins("JOIN user AS liker ON liker.id = liker_relationship.user_id").
			Where("liker.username = ?", *params.Liker).
			Where("liker_relationship.liked_at IS NOT NULL")

		if mUser != nil {
			query = query.Where(ctrl.db.Where("recording.user_id = ?", mUser.ID))
		}
	}

	if params.Keyword != nil {
		keyword := "%" + *params.Keyword + "%"
		query = query.Where("recording.title LIKE ? OR recording.description LIKE ?", keyword, keyword) 
	}

	if params.ProjectFullName != nil {
		query = query.Joins("JOIN project ON project.id = recording.project_id").
			Joins("JOIN user AS project_owner ON project_owner.id = project.owner_id").
			Where("project_owner.username = ? AND project.name = ?",
				params.ProjectFullName.Owner, params.ProjectFullName.Project)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count recordings: %w", err)
	}

	var queryOrderByColumn string
	switch params.OrderBy {
	case ListRecordingsOrderByCreatedAt:
		queryOrderByColumn = "recording.created_at"
	case ListRecordingsOrderByUpdatedAt:
		queryOrderByColumn = "recording.updated_at"
	case ListRecordingsOrderByViewCount:
		queryOrderByColumn = "recording.view_count"
	case ListRecordingsOrderByLikeCount:
		queryOrderByColumn = "recording.like_count"
	case ListRecordingsOrderByLikedAt:
		if params.Liker != nil {
			queryOrderByColumn = "liker_relationship.liked_at"
		} else {
			queryOrderByColumn = "recording.created_at"
		}
	}
	if queryOrderByColumn == "" {
		queryOrderByColumn = "recording.created_at"
	}
	query = query.Order(fmt.Sprintf("%s %s, recording.id", queryOrderByColumn, params.SortOrder))

	var mRecordings []model.Recording
	if err := query.
		Preload("User").
		Preload("Project.Owner").
		Offset(params.Pagination.Offset()).
		Limit(params.Pagination.Size).
		Find(&mRecordings).Error; err != nil {
		return nil, fmt.Errorf("failed to list recordings: %w", err)
	}

	recordingDTOs := make([]RecordingDTO, len(mRecordings))
	for i, mRecording := range mRecordings {
		recordingDTOs[i] = toRecordingDTO(mRecording)
	}

	return &ByPage[RecordingDTO]{
		Total: total,
		Data:  recordingDTOs,
	}, nil
}

// UpdateRecordingParams holds parameters for updating recording.
type UpdateRecordingParams struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

// Validate validates the parameters.
func (p *UpdateRecordingParams) Validate() (ok bool, msg string) {
	if p.Title != "" && !recordingTitleRE.Match([]byte(p.Title)) {
		return false, "invalid title"
	}
	if p.Description != "" && !recordingDescriptionRE.Match([]byte(p.Description)) {
		return false, "description must be between 0-200 characters"
	}
	return true, ""
}

// Diff returns the updates between the parameters and the model recording.
func (p *UpdateRecordingParams) Diff(mRecording *model.Recording) map[string]any {
	updates := map[string]any{}
	if p.Title != "" && p.Title != mRecording.Title {
		updates["title"] = p.Title
	}
	if p.Description != mRecording.Description {
		updates["description"] = p.Description
	}
	return updates
}

// UpdateRecording updates a recording.
func (ctrl *Controller) UpdateRecording(ctx context.Context, id string, params *UpdateRecordingParams) (*RecordingDTO, error) {
	_, ok := authn.UserFromContext(ctx)
	if !ok {
		return nil, authn.ErrUnauthorized
	}

	mRecording, err := ctrl.ensureRecording(ctx, id, true) // ownedOnly=true
	if err != nil {
		return nil, err
	}

	updates := params.Diff(mRecording)
	if len(updates) > 0 {
		if err := ctrl.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(mRecording).Error; err != nil {
				return err
			}
			updates = params.Diff(mRecording)
			if len(updates) == 0 {
				return nil
			}

			if queryResult := tx.Model(mRecording).Updates(updates); queryResult.Error != nil {
				return queryResult.Error
			} else if queryResult.RowsAffected == 0 {
				return nil
			}

			return nil
		}); err != nil {
			return nil, fmt.Errorf("failed to update recording %q: %w", id, err)
		}
	}

	recordingDTO := toRecordingDTO(*mRecording)
	return &recordingDTO, nil
}
