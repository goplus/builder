package controller

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// RecordDTO is the DTO for records.
type RecordDTO struct {
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

// toRecordDTO converts the model record to its DTO.
func toRecordDTO(mRecord model.Record) RecordDTO {
	return RecordDTO{
		ModelDTO: toModelDTO(mRecord.Model),
		Owner:    mRecord.User.Username,
		ProjectFullName: ProjectFullName{
			Owner:   mRecord.Project.Owner.Username,
			Project: mRecord.Project.Name,
		},
		Title:        mRecord.Title,
		Description:  mRecord.Description,
		VideoURL:     mRecord.VideoURL,
		ThumbnailURL: mRecord.ThumbnailURL,
		ViewCount:    mRecord.ViewCount,
		LikeCount:    mRecord.LikeCount,
	}
}

// 添加描述验证规则
var recordDescriptionRE = regexp.MustCompile(`^.{0,200}$`)

// 修改标题验证规则
var recordTitleRE = regexp.MustCompile(`^.{1,20}$`)

// ensureRecord ensures the record exists and the user has access to it.
func (ctrl *Controller) ensureRecord(ctx context.Context, id string, ownedOnly bool) (*model.Record, error) {
	var mRecord model.Record
	if err := ctrl.db.WithContext(ctx).
		Preload("User").
		Preload("Project.Owner").
		Where("id = ?", id).
		First(&mRecord).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get record: %w", err)
	}

	// Permission check logic remains unchanged
	if ownedOnly {
		if _, err := authn.EnsureUser(ctx, mRecord.UserID); err != nil {
			return nil, err
		}
	}

	return &mRecord, nil
}

// CreateRecordParams holds parameters for creating a record.
type CreateRecordParams struct {
	ProjectFullName string `json:"projectFullName"`
	Title           string `json:"title"`
	Description     string `json:"description"`
	VideoURL        string `json:"videoUrl"`
	ThumbnailURL    string `json:"thumbnailUrl"`
}

// Validate validates the CreateRecordParams.
func (p *CreateRecordParams) Validate() (ok bool, msg string) {
	if p.ProjectFullName == "" {
		return false, "missing projectFullName"
	}

	// 验证 projectFullName 格式（参考 ProjectFullName.IsValid()）
	parts := strings.Split(p.ProjectFullName, "/")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return false, "invalid projectFullName format, expected: owner/project"
	}

	if p.Title == "" {
		return false, "missing title"
	} else if !recordTitleRE.Match([]byte(p.Title)) {
		return false, "invalid title"
	}
	if p.VideoURL == "" {
		return false, "missing videoUrl"
	}
	if p.Description != "" && !recordDescriptionRE.Match([]byte(p.Description)) {
		return false, "description must be between 0-200 characters"
	}
	return true, ""
}

// CreateRecord creates a new record.
func (ctrl *Controller) CreateRecord(ctx context.Context, params *CreateRecordParams) (*RecordDTO, error) {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return nil, authn.ErrUnauthorized
	}

	if ok, msg := params.Validate(); !ok {
		return nil, fmt.Errorf("validation failed: %s", msg)
	}

    pfn, err := ParseProjectFullName(params.ProjectFullName)
    if err != nil {
        return nil, fmt.Errorf("invalid projectFullName: %w", err)
    }

	mProject, err := ctrl.ensureProject(ctx, pfn, false)
	if err != nil {
		return nil, err
	}

	if mProject.Visibility == model.VisibilityPrivate && mProject.OwnerID != mUser.ID {
		return nil, fmt.Errorf("cannot record private project")
	}

	mRecord := model.Record{
		UserID:       mUser.ID,
		ProjectID:    mProject.ID,
		Title:        params.Title,
		Description:  params.Description,
		VideoURL:     params.VideoURL,
		ThumbnailURL: params.ThumbnailURL,
	}

	if err := ctrl.db.WithContext(ctx).Create(&mRecord).Error; err != nil {
		return nil, fmt.Errorf("failed to create record: %w", err)
	}

	if err := ctrl.db.WithContext(ctx).
		Preload("User").
		Preload("Project.Owner").
		First(&mRecord, mRecord.ID).Error; err != nil {
		return nil, fmt.Errorf("failed to load record: %w", err)
	}

	recordDTO := toRecordDTO(mRecord)
	return &recordDTO, nil
}

// GetRecord gets a record by owner and name.
func (ctrl *Controller) GetRecord(ctx context.Context, id string) (*RecordDTO, error) {
	record, err := ctrl.ensureRecord(ctx, id, false)
	if err != nil {
		return nil, err
	}

	recordDTO := toRecordDTO(*record)
	return &recordDTO, nil
}

// DeleteRecord deletes a record by owner and name.
func (ctrl *Controller) DeleteRecord(ctx context.Context, id string) error {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return authn.ErrUnauthorized
	}

	record, err := ctrl.ensureRecord(ctx, id, true) // ownedOnly=true
	if err != nil {
		return err
	}

	// Additional check: ensure the current user is the owner of the record
	if record.UserID != mUser.ID {
		return authn.ErrUnauthorized
	}

	return ctrl.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        if err := tx.Delete(record).Error; err != nil {
			return fmt.Errorf("failed to delete record: %w", err)
        }

        if err := tx.Where("record_id = ?", record.ID).Delete(&model.UserRecordRelationship{}).Error; err != nil {
			return fmt.Errorf("failed to delete user_record_relationship: %w", err)
        }
        return nil
    })
}

// RecordRecordView records a view for the specified record as the authenticated user.
func (ctrl *Controller) RecordRecordView(ctx context.Context, id string) error {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return authn.ErrUnauthorized
	}

	var mRecord model.Record
	if err := ctrl.db.WithContext(ctx).
		Where("id = ?", id).
		First(&mRecord).
		Error; err != nil {
		return fmt.Errorf("failed to get record %q: %w", id, err)
	}

	mUserRecordRelationship, err := model.FirstOrCreateUserRecordRelationship(ctx, ctrl.db, mUser.ID, mRecord.ID)
	if err != nil {
		return err
	}
	if mUserRecordRelationship.LastViewedAt.Valid && time.Since(mUserRecordRelationship.LastViewedAt.Time) < time.Minute {
		// Ignore views within a minute.
		return nil
	}

	if err := ctrl.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		query := tx.Model(mUserRecordRelationship)
		if mUserRecordRelationship.LastViewedAt.Valid {
			query = query.Where("last_viewed_at = ?", mUserRecordRelationship.LastViewedAt)
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
		if err := tx.Model(&mRecord).UpdateColumn("view_count", gorm.Expr("view_count + 1")).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		return fmt.Errorf("failed to record view for record %q: %w", id, err)
	}
	return nil
}

// LikeRecord likes the specified record as the authenticated user.
func (ctrl *Controller) LikeRecord(ctx context.Context, id string) error {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return authn.ErrUnauthorized
	}

	var mRecord model.Record
	if err := ctrl.db.WithContext(ctx).
		Where("id = ?", id).
		First(&mRecord).
		Error; err != nil {
		return fmt.Errorf("failed to get record %q: %w", id, err)
	}

	mUserRecordRelationship, err := model.FirstOrCreateUserRecordRelationship(ctx, ctrl.db, mUser.ID, mRecord.ID)
	if err != nil {
		return err
	}
	if mUserRecordRelationship.LikedAt.Valid {
		return nil // Already liked
	}

	if err := ctrl.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if queryResult := tx.
			Model(mUserRecordRelationship).
			Where("liked_at IS NULL").
			UpdateColumn("liked_at", sql.NullTime{Time: time.Now().UTC(), Valid: true}); queryResult.Error != nil {
			return queryResult.Error
		} else if queryResult.RowsAffected == 0 {
			return nil
		}
		if err := tx.Model(&mRecord).UpdateColumn("like_count", gorm.Expr("like_count + 1")).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		return fmt.Errorf("failed to like record %q: %w", id, err)
	}
	return nil
}

// UnlikeRecord unlikes the specified record as the authenticated user.
func (ctrl *Controller) UnlikeRecord(ctx context.Context, id string) error {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return authn.ErrUnauthorized
	}

	var mRecord model.Record
	if err := ctrl.db.WithContext(ctx).
		Where("id = ?", id).
		First(&mRecord).
		Error; err != nil {
		return fmt.Errorf("failed to get record %q: %w", id, err)
	}

	mUserRecordRelationship, err := model.FirstOrCreateUserRecordRelationship(ctx, ctrl.db, mUser.ID, mRecord.ID)
	if err != nil {
		return err
	}
	if !mUserRecordRelationship.LikedAt.Valid {
		return nil // Already not liked
	}

	if err := ctrl.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if queryResult := tx.
			Model(mUserRecordRelationship).
			Where("liked_at IS NOT NULL").
			UpdateColumn("liked_at", sql.NullTime{}); queryResult.Error != nil {
			return queryResult.Error
		} else if queryResult.RowsAffected == 0 {
			return nil
		}
		if err := tx.Model(&mRecord).UpdateColumn("like_count", gorm.Expr("like_count - 1")).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		return fmt.Errorf("failed to unlike record %q: %w", id, err)
	}
	return nil
}

// HasLikedRecord checks if the authenticated user is liking the specified record.
func (ctrl *Controller) HasLikedRecord(ctx context.Context, id string) (bool, error) {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return false, nil // Not authenticated, so not liking
	}

	var mRecord model.Record
	if err := ctrl.db.WithContext(ctx).
		Where("id = ?", id).
		First(&mRecord).
		Error; err != nil {
		return false, fmt.Errorf("failed to get record %q: %w", id, err)
	}

	var mUserRecordRelationship model.UserRecordRelationship
	if err := ctrl.db.WithContext(ctx).
		Where("user_id = ?", mUser.ID).
		Where("record_id = ?", mRecord.ID).
		Where("liked_at IS NOT NULL").
		First(&mUserRecordRelationship).
		Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, fmt.Errorf("failed to check liking status: %w", err)
	}
	return true, nil
}

// ListRecordsOrderBy defines the available order by options
type ListRecordsOrderBy string

const (
	ListRecordsOrderByCreatedAt ListRecordsOrderBy = "createdAt"
	ListRecordsOrderByUpdatedAt ListRecordsOrderBy = "updatedAt"
	ListRecordsOrderByViewCount ListRecordsOrderBy = "viewCount"
	ListRecordsOrderByLikeCount ListRecordsOrderBy = "likeCount"
	ListRecordsOrderByLikedAt   ListRecordsOrderBy = "likedAt"
)

// IsValid reports whether the order by condition is valid.
func (ob ListRecordsOrderBy) IsValid() bool {
	switch ob {
	case ListRecordsOrderByCreatedAt,
		ListRecordsOrderByUpdatedAt,
		ListRecordsOrderByViewCount,
		ListRecordsOrderByLikeCount,
		ListRecordsOrderByLikedAt:
		return true
	}
	return false
}

// ListRecordsParams holds parameters for listing records.
type ListRecordsParams struct {
	// Owner filters records by owner username
	Owner *string

	// ProjectFullName filters records by associated project
	ProjectFullName *ProjectFullName

	// Keyword filters records by name or title
	Keyword *string

	// OrderBy specifies the field to order by
	OrderBy ListRecordsOrderBy

	// SortOrder specifies the sort direction
	SortOrder SortOrder

	// Pagination is the pagination information
	Pagination Pagination

	// Liker filters records liked by the specified user
	Liker *string
}

// NewListRecordsParams creates a new ListRecordsParams with default values.
func NewListRecordsParams() *ListRecordsParams {
	return &ListRecordsParams{
		OrderBy:    ListRecordsOrderByCreatedAt,
		SortOrder:  SortOrderDesc,
		Pagination: Pagination{Index: 1, Size: 20},
	}
}

// Validate validates the ListRecordsParams.
func (p *ListRecordsParams) Validate() (ok bool, msg string) {
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

// ListRecords lists records with filtering and pagination.
func (ctrl *Controller) ListRecords(ctx context.Context, params *ListRecordsParams) (*ByPage[RecordDTO], error) {
	mUser, _ := authn.UserFromContext(ctx)

	query := ctrl.db.WithContext(ctx).Model(&model.Record{})

	if params.Owner != nil {
		query = query.Joins("JOIN user ON user.id = record.user_id").
			Where("user.username = ?", *params.Owner)
	} else if mUser != nil && params.Liker == nil {
		// Default to current user's records if no owner specified and user is authenticated
		// BUT only if we're not filtering by liker
		query = query.Where("record.user_id = ?", mUser.ID)
	}

	if params.Liker != nil {
		query = query.
			Joins("JOIN user_record_relationship AS liker_relationship ON liker_relationship.record_id = record.id").
			Joins("JOIN user AS liker ON liker.id = liker_relationship.user_id").
			Where("liker.username = ?", *params.Liker).
			Where("liker_relationship.liked_at IS NOT NULL")

		if mUser != nil {
			query = query.Where(ctrl.db.Where("record.user_id = ?", mUser.ID))
		}
	}

	if params.Keyword != nil {
		keyword := "%" + *params.Keyword + "%"
		query = query.Where("record.title LIKE ? OR record.description LIKE ?", keyword, keyword) // ✅ 改为title和description
	}

	if params.ProjectFullName != nil {
		query = query.Joins("JOIN project ON project.id = record.project_id").
			Joins("JOIN user AS project_owner ON project_owner.id = project.owner_id").
			Where("project_owner.username = ? AND project.name = ?",
				params.ProjectFullName.Owner, params.ProjectFullName.Project)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count records: %w", err)
	}

	var queryOrderByColumn string
	switch params.OrderBy {
	case ListRecordsOrderByCreatedAt:
		queryOrderByColumn = "record.created_at"
	case ListRecordsOrderByUpdatedAt:
		queryOrderByColumn = "record.updated_at"
	case ListRecordsOrderByViewCount:
		queryOrderByColumn = "record.view_count"
	case ListRecordsOrderByLikeCount:
		queryOrderByColumn = "record.like_count"
	case ListRecordsOrderByLikedAt:
		if params.Liker != nil {
			queryOrderByColumn = "liker_relationship.liked_at"
		} else {
			queryOrderByColumn = "record.created_at"
		}
	}
	if queryOrderByColumn == "" {
		queryOrderByColumn = "record.created_at"
	}
	query = query.Order(fmt.Sprintf("%s %s, record.id", queryOrderByColumn, params.SortOrder))

	var mRecords []model.Record
	if err := query.
		Preload("User").
		Preload("Project.Owner").
		Offset(params.Pagination.Offset()).
		Limit(params.Pagination.Size).
		Find(&mRecords).Error; err != nil {
		return nil, fmt.Errorf("failed to list records: %w", err)
	}

	recordDTOs := make([]RecordDTO, len(mRecords))
	for i, mRecord := range mRecords {
		recordDTOs[i] = toRecordDTO(mRecord)
	}

	return &ByPage[RecordDTO]{
		Total: total,
		Data:  recordDTOs,
	}, nil
}

// UpdateRecordParams holds parameters for updating record.
type UpdateRecordParams struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

// Validate validates the parameters.
func (p *UpdateRecordParams) Validate() (ok bool, msg string) {
	if p.Title != "" && !recordTitleRE.Match([]byte(p.Title)) {
		return false, "invalid title"
	}
	if p.Description != "" && !recordDescriptionRE.Match([]byte(p.Description)) {
		return false, "description must be between 0-200 characters"
	}
	return true, ""
}

// Diff returns the updates between the parameters and the model record.
func (p *UpdateRecordParams) Diff(mRecord *model.Record) map[string]any {
	updates := map[string]any{}
	if p.Title != "" && p.Title != mRecord.Title {
		updates["title"] = p.Title
	}
	if p.Description != mRecord.Description {
		updates["description"] = p.Description
	}
	return updates
}

// UpdateRecord updates a record.
func (ctrl *Controller) UpdateRecord(ctx context.Context, id string, params *UpdateRecordParams) (*RecordDTO, error) {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return nil, authn.ErrUnauthorized
	}

	mRecord, err := ctrl.ensureRecord(ctx, id, true) // ownedOnly=true
	if err != nil {
		return nil, err
	}

	// Additional check: ensure the current user is the owner of the record
	if mRecord.UserID != mUser.ID {
		return nil, authn.ErrUnauthorized
	}

	updates := params.Diff(mRecord)
	if len(updates) > 0 {
		if err := ctrl.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(mRecord).Error; err != nil {
				return err
			}
			updates = params.Diff(mRecord)
			if len(updates) == 0 {
				return nil
			}

			if queryResult := tx.Model(mRecord).Updates(updates); queryResult.Error != nil {
				return queryResult.Error
			} else if queryResult.RowsAffected == 0 {
				return nil
			}

			return nil
		}); err != nil {
			return nil, fmt.Errorf("failed to update record %q: %w", id, err)
		}
	}

	recordDTO := toRecordDTO(*mRecord)
	return &recordDTO, nil
}
