package controller

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/goplus/builder/spx-backend/internal/model"
	"gorm.io/gorm"
)

const (
	AllowedTimeDiff = 10 * time.Second // Updated the time difference limit for the latest levels in the storyline
)

type StorylineDto struct {
	ModelDTO
	BackgroundImage string        `json:"backgroundImage"`
	Name            string        `json:"name"`
	Title           LocaleMessage `json:"title"`
	Description     LocaleMessage `json:"description"`
	Tag             LocaleMessage `json:"tag"`
	Levels          string        `json:"levels"`
}

type LocaleMessage struct {
	En string `json:"en"`
	Zh string `json:"zh"`
}

// toStorylineDto converts a storyline model to a storyline DTO.
func toStorylineDto(m model.Storyline) StorylineDto {
	tag := strings.Split(m.Tag.String(), ",")
	title := LocaleMessage{}
	_ = json.Unmarshal([]byte(m.Title), &title)
	description := LocaleMessage{}
	_ = json.Unmarshal([]byte(m.Description), &description)

	return StorylineDto{
		ModelDTO:        toModelDTO(m.Model),
		BackgroundImage: m.BackgroundImage,
		Name:            m.Name,
		Title:           title,
		Description:     description,
		Tag: LocaleMessage{
			En: tag[0],
			Zh: tag[1],
		},
		Levels: m.Levels,
	}
}

// ensureStoryline ensures the storyline exists.
func (ctrl *Controller) ensureStoryline(ctx context.Context, storylineId int64) (*model.Storyline, error) {
	var mStoryline model.Storyline
	if err := ctrl.db.WithContext(ctx).
		Where("id = ?", storylineId).
		First(&mStoryline).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get storyline: %w", err)
	}

	return &mStoryline, nil
}

// GetStoryline Get the storyline by ID
func (ctrl *Controller) GetStoryline(ctx context.Context, id string) (*StorylineDto, error) {
	storylineId, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid asset id: %w", err)
	}
	mStoryline, err := ctrl.ensureStoryline(ctx, storylineId)
	if err != nil {
		return nil, err
	}

	StorylineDto := toStorylineDto(*mStoryline)

	return &StorylineDto, nil
}

type UserStorylineRelationshipDto struct {
	StorylineID            int64 `json:"storylineId"`
	LastFinishedLevelIndex int8  `json:"lastFinishedLevelIndex"`
}

// toUserStorylineRelationshipDto converts a user-storyline relationship model to a user-storyline relationship DTO.
func toUserStorylineRelationshipDto(m model.UserStorylineRelationship) UserStorylineRelationshipDto {
	return UserStorylineRelationshipDto{
		StorylineID:            m.StorylineID,
		LastFinishedLevelIndex: m.LastFinishedLevelIndex,
	}
}

// StudyStoryline Users learn the storyline
func (ctrl *Controller) StudyStoryline(ctx context.Context, id string) (*UserStorylineRelationshipDto, error) {
	mAuthedUser, _ := AuthedUserFromContext(ctx)

	if id == "" {
		return nil, fmt.Errorf("storyline ID is required")
	}

	var mStoryline model.Storyline
	if err := ctrl.db.WithContext(ctx).
		Where("id = ?", id).
		First(&mStoryline).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get storyline: %w", err)
	}

	var mUserStorylineRelationship model.UserStorylineRelationship
	if err := ctrl.db.WithContext(ctx).
		Where("user_id = ? AND storyline_id = ?", mAuthedUser.ID, mStoryline.ID). // TODO: replace 1 with mAuthedUser.ID
		First(&mUserStorylineRelationship).
		Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("failed to check user-storyline relationship: %w", err)
		}

		mUserStorylineRelationship = model.UserStorylineRelationship{
			UserID:                 mAuthedUser.ID, // TODO: replace 1 with mAuthedUser.ID
			StorylineID:            mStoryline.ID,
			LastFinishedLevelIndex: 0,
		}

		if err := ctrl.db.WithContext(ctx).
			Create(&mUserStorylineRelationship).
			Error; err != nil {
			return nil, fmt.Errorf("failed to create user-storyline relationship: %w", err)
		}

		userStorylineRelationshipDto := toUserStorylineRelationshipDto(mUserStorylineRelationship)

		return &userStorylineRelationshipDto, nil
	}

	return nil, fmt.Errorf("user has already studied the storyline")
}

// GetStoryLineStudy Get the user's learning status of the storyline
func (ctrl *Controller) GetStoryLineStudy(ctx context.Context, id string) (*UserStorylineRelationshipDto, error) {
	mAuthedUser, _ := AuthedUserFromContext(ctx)

	if id == "" {
		return nil, fmt.Errorf("storyline ID is required")
	}

	var mUserStorylineRelationship model.UserStorylineRelationship
	if err := ctrl.db.WithContext(ctx).
		Where("user_id = ? AND storyline_id = ?", mAuthedUser.ID, id). // TODO: replace 1 with mAuthedUser.ID
		First(&mUserStorylineRelationship).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get user-storyline relationship: %w", err)
	}

	userStorylineRelationshipDto := toUserStorylineRelationshipDto(mUserStorylineRelationship)

	return &userStorylineRelationshipDto, nil
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
func (ctrl *Controller) FinishStorylineLevel(ctx context.Context, id string, param *UpdateUserStorylineRelationshipParam) (*UserStorylineRelationshipDto, error) {
	mAuthedUser, _ := AuthedUserFromContext(ctx)

	if id == "" {
		return nil, fmt.Errorf("storyline ID is required")
	}

	lastFinishedLevelIndex := param.LastFinishedLevelIndex

	var mUserStorylineRelationship model.UserStorylineRelationship
	if err := ctrl.db.WithContext(ctx).
		Where("user_id = ? AND storyline_id = ?", mAuthedUser.ID, id). // TODO: replace 1 with mAuthedUser.ID
		First(&mUserStorylineRelationship).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get user-storyline relationship: %w", err)
	}

	if lastFinishedLevelIndex != mUserStorylineRelationship.LastFinishedLevelIndex+1 {
		return nil, fmt.Errorf("invalid level index")
	}

	// Control update interval limits users by bypassing front-end updates
	currentTime := time.Now()
	timeDiff := currentTime.Sub(mUserStorylineRelationship.UpdatedAt)
	if timeDiff < AllowedTimeDiff {
		return nil, fmt.Errorf("too frequent operation")
	}

	mUserStorylineRelationship.LastFinishedLevelIndex = lastFinishedLevelIndex
	if err := ctrl.db.WithContext(ctx).
		Save(&mUserStorylineRelationship).
		Error; err != nil {
		return nil, fmt.Errorf("failed to save user-storyline relationship: %w", err)
	}

	userStorylineRelationshipDto := toUserStorylineRelationshipDto(mUserStorylineRelationship)

	return &userStorylineRelationshipDto, nil
}
