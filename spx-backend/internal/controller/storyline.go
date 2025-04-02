package controller

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"time"

	"golang.org/x/time/rate"

	"github.com/goplus/builder/spx-backend/internal/model"
	"gorm.io/gorm"
)

const (
	allowedTimeDiff = 10 * time.Second // Updated the time difference limit for the latest levels in the storyline
)

type StorylineDTO struct {
	ModelDTO
	BackgroundImage string        `json:"backgroundImage"`
	Name            string        `json:"name"`
	Title           LocaleMessage `json:"title"`
	Description     LocaleMessage `json:"description"`
	Tag             string        `json:"tag"`
	Levels          string        `json:"levels"`
}

type LocaleMessage struct {
	En string `json:"en"`
	Zh string `json:"zh"`
}

// toStorylineDTO converts a storyline model to a storyline DTO.
func toStorylineDTO(m model.Storyline) StorylineDTO {
	title := LocaleMessage{}
	_ = json.Unmarshal([]byte(m.Title), &title)
	description := LocaleMessage{}
	_ = json.Unmarshal([]byte(m.Description), &description)

	return StorylineDTO{
		ModelDTO:        toModelDTO(m.Model),
		BackgroundImage: m.BackgroundImage,
		Name:            m.Name,
		Title:           title,
		Description:     description,
		Tag:             m.Tag.String(),
		Levels:          m.Levels,
	}
}

// ensureStoryline ensures the storyline exists.
func (ctrl *Controller) ensureStoryline(ctx context.Context, storylineId int64) (*model.Storyline, error) {
	var mStoryline model.Storyline
	if err := ctrl.db.WithContext(ctx).
		Where("id = ?", storylineId).
		First(&mStoryline).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get storyline %d: %w", storylineId, err)
	}

	return &mStoryline, nil
}

// GetStoryline Get the storyline by ID
func (ctrl *Controller) GetStoryline(ctx context.Context, id string) (*StorylineDTO, error) {
	storylineId, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return nil, ErrBadRequest
	}
	mStoryline, err := ctrl.ensureStoryline(ctx, storylineId)
	if err != nil {
		return nil, err
	}

	StorylineDTO := toStorylineDTO(*mStoryline)

	return &StorylineDTO, nil
}

type UserStorylineRelationshipDTO struct {
	StorylineID            int64 `json:"storylineId"`
	LastFinishedLevelIndex int8  `json:"lastFinishedLevelIndex"`
}

// toUserStorylineRelationshipDTO converts a user-storyline relationship model to a user-storyline relationship DTO.
func toUserStorylineRelationshipDTO(m model.UserStorylineRelationship) UserStorylineRelationshipDTO {
	return UserStorylineRelationshipDTO{
		StorylineID:            m.StorylineID,
		LastFinishedLevelIndex: m.LastFinishedLevelIndex,
	}
}

// StudyStoryline Users learn the storyline
func (ctrl *Controller) StudyStoryline(ctx context.Context, id string) (*UserStorylineRelationshipDTO, error) {
	mAuthedUser, _ := AuthedUserFromContext(ctx)

	if id == "" {
		return nil, ErrBadRequest
	}

	storylineId, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return nil, ErrBadRequest
	}

	mStoryline, err := ctrl.ensureStoryline(ctx, storylineId)
	if err != nil {
		return nil, err
	}

	var mUserStorylineRelationship model.UserStorylineRelationship
	if err := ctrl.db.WithContext(ctx).
		Where("user_id = ? AND storyline_id = ?", mAuthedUser.ID, mStoryline.ID).
		First(&mUserStorylineRelationship).
		Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("failed to check user-storyline relationship: %w", err)
		}

		mUserStorylineRelationship = model.UserStorylineRelationship{
			UserID:                 mAuthedUser.ID,
			StorylineID:            mStoryline.ID,
			LastFinishedLevelIndex: 0,
		}

		if err := ctrl.db.WithContext(ctx).
			Create(&mUserStorylineRelationship).
			Error; err != nil {
			return nil, fmt.Errorf("failed to create user-storyline relationship: %w", err)
		}

		userStorylineRelationshipDTO := toUserStorylineRelationshipDTO(mUserStorylineRelationship)

		return &userStorylineRelationshipDTO, nil
	}

	return nil, ErrBadRequest
}

// GetStoryLineStudy Get the user's learning status of the storyline
func (ctrl *Controller) GetStoryLineStudy(ctx context.Context, id string) (*UserStorylineRelationshipDTO, error) {
	mAuthedUser, _ := AuthedUserFromContext(ctx)

	if id == "" {
		return nil, ErrBadRequest
	}
	storylineId, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return nil, ErrBadRequest
	}

	var mUserStorylineRelationship model.UserStorylineRelationship
	if err := ctrl.db.WithContext(ctx).
		Where("user_id = ? AND storyline_id = ?", mAuthedUser.ID, storylineId).
		First(&mUserStorylineRelationship).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get user-storyline relationship: %w", err)
	}

	userStorylineRelationshipDTO := toUserStorylineRelationshipDTO(mUserStorylineRelationship)

	return &userStorylineRelationshipDTO, nil
}

type UpdateUserStorylineRelationshipParam struct {
	LastFinishedLevelIndex int8 `json:"lastFinishedLevelIndex"`
}

func (p *UpdateUserStorylineRelationshipParam) Validate() (ok bool, msg string) {
	if p.LastFinishedLevelIndex < 0 {
		return false, "invalid lastFinishedLevelIndex"
	}
	return true, ""
}

// FinishStorylineLevel Users finish the level of the storyline
func (ctrl *Controller) FinishStorylineLevel(ctx context.Context, id string, param *UpdateUserStorylineRelationshipParam) (*UserStorylineRelationshipDTO, error) {
	mAuthedUser, _ := AuthedUserFromContext(ctx)

	if id == "" {
		return nil, ErrBadRequest
	}

	storylineId, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return nil, ErrBadRequest
	}

	lastFinishedLevelIndex := param.LastFinishedLevelIndex

	var mUserStorylineRelationship model.UserStorylineRelationship
	if err := ctrl.db.WithContext(ctx).
		Where("user_id = ? AND storyline_id = ?", mAuthedUser.ID, storylineId).
		First(&mUserStorylineRelationship).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get user-storyline relationship: %w", err)
	}

	if lastFinishedLevelIndex != mUserStorylineRelationship.LastFinishedLevelIndex+1 {
		return nil, ErrBadRequest
	}

	// Control update interval limits users by bypassing front-end updates
	currentTime := time.Now()
	timeDiff := currentTime.Sub(mUserStorylineRelationship.UpdatedAt)
	if timeDiff < allowedTimeDiff {
		return nil, ErrForbidden
	}

	updates := map[string]any{}
	updates["last_finished_level_index"] = lastFinishedLevelIndex

	if err := ctrl.db.WithContext(ctx).
		Model(mUserStorylineRelationship).
		Updates(updates).
		Error; err != nil {
		return nil, fmt.Errorf("failed to update user-storyline relationship: %w", err)
	}
	mUserStorylineRelationship.LastFinishedLevelIndex = lastFinishedLevelIndex
	userStorylineRelationshipDTO := toUserStorylineRelationshipDTO(mUserStorylineRelationship)

	return &userStorylineRelationshipDTO, nil
}

type CheckCodeParams struct {
	UserCode     string `json:"userCode"`
	ExpectedCode string `json:"expectedCode"`
	Context      string `json:"context"`
}

func (p *CheckCodeParams) Validate() (ok bool, msg string) {
	if p.UserCode == "" {
		return false, "invalid user code"
	}
	if p.ExpectedCode == "" {
		return false, "invalid expected code"
	}
	if len(p.UserCode) > 10000 {
		return false, "user code too long"
	}
	if len(p.ExpectedCode) > 10000 {
		return false, "expected code too long"
	}
	if len(p.Context) > 10000 {
		return false, "context too long"
	}
	return true, ""
}

const (
	// Timeout for a single request
	timeout    = 10 * time.Second
	rateLimit  = 0.2
	burstLimit = 1
)

var (
	limiter = rate.NewLimiter(rate.Limit(rateLimit), burstLimit)
)

// CheckCode Check the code
func (ctrl *Controller) CheckCode(ctx context.Context, param *CheckCodeParams) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, timeout*3)
	defer cancel()

	// Wait for the rate limit to pass
	if err := limiter.Wait(ctx); err != nil {
		if errors.Is(err, context.DeadlineExceeded) {
			return false, fmt.Errorf("request timed out waiting for rate limit")
		}
		return false, fmt.Errorf("rate limit exceeded: %w", err)
	}

	result, err := ctrl.chat91DictCnGeminiClient.ContrastCode(ctx, param.Context, param.UserCode, param.ExpectedCode)
	if err != nil {
		return result, fmt.Errorf("failed to compare code: %w", err)
	}

	return result, nil
}

type ListStorylineParams struct {
	Tag        *string    `json:"tag"`
	Pagination Pagination `json:"pagination"`
	SortOrder  SortOrder  `json:"sortOrder"`
}

func NewListStorylineParams() *ListStorylineParams {
	return &ListStorylineParams{
		SortOrder:  SortOrderAsc,
		Pagination: Pagination{Index: 1, Size: 10},
	}
}

func (p *ListStorylineParams) Validate() (ok bool, msg string) {
	if p.Tag != nil && model.ParseStorylineTag(*p.Tag).String() != *p.Tag {
		return false, "invalid tag"
	}
	if !p.Pagination.IsValid() {
		return false, "invalid pagination"
	}
	if !p.SortOrder.IsValid() {
		return false, "invalid sort order"
	}
	return true, ""
}

// GetStorylineList Get the list of storylines
func (ctrl *Controller) ListStoryline(ctx context.Context, params *ListStorylineParams) (*ByPage[StorylineDTO], error) {
	query := ctrl.db.WithContext(ctx).Model(&model.Storyline{})
	if params.Tag != nil {
		query = query.Where("tag = ?", model.ParseStorylineTag(*params.Tag))
	}
	query = query.Order(fmt.Sprintf("created_at %s", params.SortOrder))

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count storyline: %w", err)
	}

	var mStorylines []model.Storyline
	if err := query.
		Offset(params.Pagination.Offset()).
		Limit(params.Pagination.Size).
		Find(&mStorylines).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get storyline: %w", err)
	}

	storylineDTOs := make([]StorylineDTO, len(mStorylines))
	for i, mStoryline := range mStorylines {
		storylineDTOs[i] = toStorylineDTO(mStoryline)
	}

	return &ByPage[StorylineDTO]{
		Total: total,
		Data:  storylineDTOs,
	}, nil
}

type CreateStorylineParams struct {
	BackgroundImage string        `json:"backgroundImage"`
	Name            string        `json:"name"`
	Title           LocaleMessage `json:"title"`
	Description     LocaleMessage `json:"description"`
	Tag             string        `json:"tag"`
	Levels          string        `json:"levels"`
}

func (p *CreateStorylineParams) Validate() (ok bool, msg string) {
	if p.BackgroundImage == "" {
		return false, "invalid background image"
	}
	if p.Name == "" {
		return false, "invalid name"
	}
	if p.Title.En == "" || p.Title.Zh == "" {
		return false, "invalid title"
	}
	if p.Description.En != "" && p.Description.Zh == "" || p.Description.En == "" && p.Description.Zh != "" {
		return false, "invalid description"
	}
	if p.Tag == "" {
		return false, "invalid tag"
	}
	if p.Levels == "" {
		return false, "invalid levels"
	}
	return true, ""
}

// CreateStoryline Create a storyline
func (ctrl *Controller) CreateStoryline(ctx context.Context, params *CreateStorylineParams) (*StorylineDTO, error) {
	mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
	if !isAuthed {
		return nil, ErrUnauthorized
	}

	if ok, msg := params.Validate(); !ok {
		return nil, fmt.Errorf("invalid params: %s", msg)
	}

	title, err := json.Marshal(params.Title)
	if err != nil {
		return nil, ErrBadRequest
	}

	description, err := json.Marshal(params.Description)
	if err != nil {
		return nil, ErrBadRequest
	}

	mStoryline := model.Storyline{
		OwnerID:         mAuthedUser.ID,
		BackgroundImage: params.BackgroundImage,
		Name:            params.Name,
		Title:           string(title),
		Description:     string(description),
		Tag:             model.ParseStorylineTag(params.Tag),
		Levels:          params.Levels,
	}

	if err := ctrl.db.WithContext(ctx).
		Create(&mStoryline).
		Error; err != nil {
		return nil, fmt.Errorf("failed to create storyline: %w", err)
	}

	storylineDTO := toStorylineDTO(mStoryline)

	return &storylineDTO, nil
}

type UpdateStorylineParams struct {
	BackgroundImage string        `json:"backgroundImage"`
	Name            string        `json:"name"`
	Title           LocaleMessage `json:"title"`
	Description     LocaleMessage `json:"description"`
	Tag             string        `json:"tag"`
	Levels          string        `json:"levels"`
}

// Diff returns the difference between the params and the storyline model.
func (p *UpdateStorylineParams) Diff(mStoryline *model.Storyline) map[string]any {
	updates := map[string]any{}
	if p.BackgroundImage != mStoryline.BackgroundImage {
		updates["background_image"] = p.BackgroundImage
	}
	if p.Name != mStoryline.Name {
		updates["name"] = p.Name
	}

	title, err := json.Marshal(p.Title)
	if err != nil {
		return nil
	}
	if string(title) != mStoryline.Title {
		updates["title"] = string(title)
	}

	description, err := json.Marshal(p.Description)
	if err != nil {
		return nil
	}
	if string(description) != mStoryline.Description {
		updates["description"] = string(description)
	}

	if model.ParseStorylineTag(p.Tag) != mStoryline.Tag {
		updates["tag"] = model.ParseStorylineTag(p.Tag)
	}
	if p.Levels != mStoryline.Levels {
		updates["levels"] = p.Levels
	}
	return updates
}

// UpdateStoryline Update the storyline
func (ctrl *Controller) UpdateStoryline(ctx context.Context, id string, params *UpdateStorylineParams) (*StorylineDTO, error) {
	mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
	if !isAuthed {
		return nil, ErrUnauthorized
	}

	if id == "" {
		return nil, ErrBadRequest
	}

	storylineId, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return nil, ErrBadRequest
	}

	mStoryline, err := ctrl.ensureStoryline(ctx, storylineId)
	if err != nil {
		return nil, err
	}

	if mAuthedUser.ID != mStoryline.OwnerID {
		return nil, ErrForbidden
	}

	updates := params.Diff(mStoryline)

	if len(updates) == 0 {
		return nil, ErrBadRequest
	}

	if err := ctrl.db.WithContext(ctx).
		Model(mStoryline).
		Updates(updates).
		Error; err != nil {
		return nil, fmt.Errorf("failed to update storyline: %w", err)
	}

	storylineDTO := toStorylineDTO(*mStoryline)

	return &storylineDTO, nil
}

// DeleteStoryline Delete the storyline
func (ctrl *Controller) DeleteStoryline(ctx context.Context, id string) error {
	mAuthedUser, isAuthed := AuthedUserFromContext(ctx)
	if !isAuthed {
		return ErrUnauthorized
	}

	if id == "" {
		return ErrBadRequest
	}

	storylineId, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return ErrBadRequest
	}

	return ctrl.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var mStoryline model.Storyline
		if err := tx.Where("id = ?", storylineId).First(&mStoryline).Error; err != nil {
			return fmt.Errorf("failed to get storyline %d: %w", storylineId, err)
		}

		if mAuthedUser.ID != mStoryline.OwnerID {
			return ErrForbidden
		}

		if err := tx.Where("storyline_id = ?", storylineId).Delete(&model.UserStorylineRelationship{}).Error; err != nil {
			return fmt.Errorf("failed to delete user-storyline relationships: %w", err)
		}

		if err := tx.Delete(&mStoryline).Error; err != nil {
			return fmt.Errorf("failed to delete storyline: %w", err)
		}

		return nil
	})
}
