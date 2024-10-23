package controller

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/goplus/builder/spx-backend/internal/model"
	"gorm.io/gorm"
)

// UserDTO is the DTO for users.
type UserDTO struct {
	ModelDTO

	Username           string `json:"username"`
	DisplayName        string `json:"displayName"`
	Avatar             string `json:"avatar"`
	Description        string `json:"description"`
	FollowerCount      int64  `json:"followerCount"`
	FollowingCount     int64  `json:"followingCount"`
	ProjectCount       int64  `json:"projectCount"`
	PublicProjectCount int64  `json:"publicProjectCount"`
	LikedProjectCount  int64  `json:"likedProjectCount"`
}

// toUserDTO converts the model user to its DTO.
func toUserDTO(mUser model.User) UserDTO {
	return UserDTO{
		ModelDTO:           toModelDTO(mUser.Model),
		Username:           mUser.Username,
		DisplayName:        mUser.DisplayName,
		Avatar:             mUser.Avatar,
		Description:        mUser.Description,
		FollowerCount:      mUser.FollowerCount,
		FollowingCount:     mUser.FollowingCount,
		ProjectCount:       mUser.ProjectCount,
		PublicProjectCount: mUser.PublicProjectCount,
		LikedProjectCount:  mUser.LikedProjectCount,
	}
}

// userContextKey is the context key for user.
var userContextKey = &contextKey{"user"}

// NewContextWithUser creates a new context with user.
func NewContextWithUser(ctx context.Context, mUser *model.User) context.Context {
	return context.WithValue(ctx, userContextKey, mUser)
}

// UserFromContext gets user from context.
func UserFromContext(ctx context.Context) (mUser *model.User, ok bool) {
	mUser, ok = ctx.Value(userContextKey).(*model.User)
	return
}

// ensureUser ensures there is a user in the context and it matches the expected
// user.
func ensureUser(ctx context.Context, expectedUserID int64) (*model.User, error) {
	mUser, ok := UserFromContext(ctx)
	if !ok {
		return nil, ErrUnauthorized
	}
	if mUser.ID != expectedUserID {
		return nil, ErrForbidden
	}
	return mUser, nil
}

// UserFromToken gets user from the provided JWT token.
func (ctrl *Controller) UserFromToken(ctx context.Context, token string) (*model.User, error) {
	claims, err := ctrl.casdoorClient.ParseJwtToken(token)
	if err != nil {
		return nil, fmt.Errorf("ctrl.casdoorClient.ParseJwtToken failed: %w: %w", ErrUnauthorized, err)
	}
	mUser, err := model.FirstOrCreateUser(ctx, ctrl.db, &claims.User)
	if err != nil {
		return nil, err
	}
	return mUser, nil
}

// ListUsersOrderBy is the order by condition for listing users.
type ListUsersOrderBy string

const (
	ListUsersOrderByCreatedAt  ListUsersOrderBy = "createdAt"
	ListUsersOrderByUpdatedAt  ListUsersOrderBy = "updatedAt"
	ListUsersOrderByFollowedAt ListUsersOrderBy = "followedAt"
)

// IsValid reports whether the order by condition is valid.
func (ob ListUsersOrderBy) IsValid() bool {
	switch ob {
	case ListUsersOrderByCreatedAt, ListUsersOrderByUpdatedAt, ListUsersOrderByFollowedAt:
		return true
	}
	return false
}

// ListUsersParams holds parameters for listing users.
type ListUsersParams struct {
	// Follower filters users who are being followed by the specified user.
	//
	// Applied only if non-nil.
	Follower *string

	// Followee filters users who are following the specified user.
	//
	// Applied only if non-nil.
	Followee *string

	// OrderBy indicates the field by which to order the results.
	OrderBy ListUsersOrderBy

	// SortOrder indicates the order in which to sort the results.
	SortOrder SortOrder

	// Pagination is the pagination information.
	Pagination Pagination
}

// NewListUsersParams creates a new ListUsersParams.
func NewListUsersParams() *ListUsersParams {
	return &ListUsersParams{
		OrderBy:    ListUsersOrderByCreatedAt,
		SortOrder:  SortOrderDesc,
		Pagination: Pagination{Index: 1, Size: 20},
	}
}

// Validate validates the parameters.
func (p *ListUsersParams) Validate() (ok bool, msg string) {
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

// ListUsers retrieves a paginated list of users with optional filtering and ordering.
func (ctrl *Controller) ListUsers(ctx context.Context, params *ListUsersParams) (*ByPage[UserDTO], error) {
	query := ctrl.db.WithContext(ctx).Model(&model.User{})
	if params.Follower != nil {
		query = query.Joins("JOIN user AS follower ON follower.username = ?", *params.Follower).
			Joins("JOIN user_relationship AS follower_relationship ON follower_relationship.user_id = follower.id AND follower_relationship.target_user_id = user.id").
			Where("follower_relationship.followed_at IS NOT NULL")
	}
	if params.Followee != nil {
		query = query.Joins("JOIN user AS followee ON followee.username = ?", *params.Followee).
			Joins("JOIN user_relationship AS followee_relationship ON followee_relationship.target_user_id = followee.id AND followee_relationship.user_id = user.id").
			Where("followee_relationship.followed_at IS NOT NULL")
	}
	var queryOrderByColumn string
	switch params.OrderBy {
	case ListUsersOrderByCreatedAt:
	case ListUsersOrderByUpdatedAt:
		queryOrderByColumn = "user.updated_at"
	case ListUsersOrderByFollowedAt:
		switch {
		case params.Follower != nil:
			queryOrderByColumn = "follower_relationship.followed_at"
		case params.Followee != nil:
			queryOrderByColumn = "followee_relationship.followed_at"
		}
	}
	if queryOrderByColumn == "" {
		queryOrderByColumn = "user.created_at"
	}
	query = query.Order(fmt.Sprintf("%s %s, user.id", queryOrderByColumn, params.SortOrder))

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count users: %w", err)
	}

	var mUsers []model.User
	if err := query.
		Offset(params.Pagination.Offset()).
		Limit(params.Pagination.Size).
		Find(&mUsers).
		Error; err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}
	userDTOs := make([]UserDTO, len(mUsers))
	for i, mUser := range mUsers {
		userDTOs[i] = toUserDTO(mUser)
	}
	return &ByPage[UserDTO]{
		Total: total,
		Data:  userDTOs,
	}, nil
}

// GetUser gets user by username.
func (ctrl *Controller) GetUser(ctx context.Context, username string) (*UserDTO, error) {
	var mUser model.User
	if err := ctrl.db.WithContext(ctx).
		Where("username = ?", username).
		First(&mUser).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get user %s: %w", username, err)
	}

	casdoorUser, err := ctrl.casdoorClient.GetUser(mUser.Username)
	if err != nil {
		return nil, fmt.Errorf("ctrl.casdoorClient.GetUser failed: %w", err)
	}
	mUserUpdates := map[string]any{}
	if mUser.DisplayName != casdoorUser.DisplayName {
		mUserUpdates["display_name"] = casdoorUser.DisplayName
	}
	if mUser.Avatar != casdoorUser.Avatar {
		mUserUpdates["avatar"] = casdoorUser.Avatar
	}
	if len(mUserUpdates) > 0 {
		if err := ctrl.db.WithContext(ctx).Model(&mUser).Updates(mUserUpdates).Error; err != nil {
			return nil, fmt.Errorf("failed to update user %s: %w", mUser.Username, err)
		}
	}

	userDTO := toUserDTO(mUser)
	return &userDTO, nil
}

// UpdateAuthedUserParams holds parameters for updating the authenticated user.
type UpdateAuthedUserParams struct {
	Description string
}

// Validate validates the parameters.
func (p *UpdateAuthedUserParams) Validate() (ok bool, msg string) {
	return true, ""
}

// Diff returns the updates between the parameters and the model user.
func (p *UpdateAuthedUserParams) Diff(mUser *model.User) map[string]any {
	updates := map[string]any{}
	if p.Description != mUser.Description {
		updates["description"] = p.Description
	}
	return updates
}

// UpdateAuthedUser updates the authenticated user.
func (ctrl *Controller) UpdateAuthedUser(ctx context.Context, params *UpdateAuthedUserParams) (*UserDTO, error) {
	mUser, ok := UserFromContext(ctx)
	if !ok {
		return nil, ErrUnauthorized
	}
	updates := params.Diff(mUser)
	if len(updates) > 0 {
		if err := ctrl.db.WithContext(ctx).Model(mUser).Updates(updates).Error; err != nil {
			return nil, fmt.Errorf("failed to update authenticated user %s: %w", mUser.Username, err)
		}
	}
	userDTO := toUserDTO(*mUser)
	return &userDTO, nil
}

// FollowUser follows the target user as the authenticated user.
func (ctrl *Controller) FollowUser(ctx context.Context, targetUsername string) error {
	mUser, ok := UserFromContext(ctx)
	if !ok {
		return ErrUnauthorized
	}
	if mUser.Username == targetUsername {
		return ErrBadRequest
	}

	var mTargetUser model.User
	if err := ctrl.db.WithContext(ctx).
		Where("username = ?", targetUsername).
		First(&mTargetUser).
		Error; err != nil {
		return fmt.Errorf("failed to get target user %s: %w", targetUsername, err)
	}

	mUserRelationship, err := model.FirstOrCreateUserRelationship(ctx, ctrl.db, mUser.ID, mTargetUser.ID)
	if err != nil {
		return err
	}
	if mUserRelationship.FollowedAt.Valid {
		return nil
	}

	if err := ctrl.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if queryResult := tx.
			Model(mUserRelationship).
			Where("followed_at IS NULL").
			Update("followed_at", sql.NullTime{Time: time.Now().UTC(), Valid: true}); queryResult.Error != nil {
			return queryResult.Error
		} else if queryResult.RowsAffected == 0 {
			return nil
		}
		if err := tx.Model(mUser).Update("following_count", gorm.Expr("following_count + 1")).Error; err != nil {
			return err
		}
		if err := tx.Model(&mTargetUser).Update("follower_count", gorm.Expr("follower_count + 1")).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		return fmt.Errorf("failed to follow user %s: %w", targetUsername, err)
	}
	return nil
}

// IsFollowingUser checks if the authenticated user is following the target user.
func (ctrl *Controller) IsFollowingUser(ctx context.Context, targetUsername string) (bool, error) {
	mUser, ok := UserFromContext(ctx)
	if !ok {
		return false, ErrUnauthorized
	}
	if mUser.Username == targetUsername {
		return false, ErrBadRequest
	}

	var mTargetUser model.User
	if err := ctrl.db.WithContext(ctx).
		Where("username = ?", targetUsername).
		First(&mTargetUser).
		Error; err != nil {
		return false, fmt.Errorf("failed to get target user %s: %w", targetUsername, err)
	}

	if err := ctrl.db.WithContext(ctx).
		Select("id").
		Where("user_id = ?", mUser.ID).
		Where("target_user_id = ?", mTargetUser.ID).
		Where("followed_at IS NOT NULL").
		First(&model.UserRelationship{}).
		Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, fmt.Errorf("failed to check if user %s is following user %s: %w", mUser.Username, targetUsername, err)
	}
	return true, nil
}

// UnfollowUser unfollows the target user as the authenticated user.
func (ctrl *Controller) UnfollowUser(ctx context.Context, targetUsername string) error {
	mUser, ok := UserFromContext(ctx)
	if !ok {
		return ErrUnauthorized
	}
	if mUser.Username == targetUsername {
		return ErrBadRequest
	}

	var mTargetUser model.User
	if err := ctrl.db.WithContext(ctx).
		Where("username = ?", targetUsername).
		First(&mTargetUser).
		Error; err != nil {
		return fmt.Errorf("failed to get target user %s: %w", targetUsername, err)
	}

	mUserRelationship, err := model.FirstOrCreateUserRelationship(ctx, ctrl.db, mUser.ID, mTargetUser.ID)
	if err != nil {
		return err
	}
	if !mUserRelationship.FollowedAt.Valid {
		return nil
	}

	if err := ctrl.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if queryResult := tx.
			Model(mUserRelationship).
			Where("followed_at = ?", mUserRelationship.FollowedAt).
			Update("followed_at", sql.NullTime{}); queryResult.Error != nil {
			return queryResult.Error
		} else if queryResult.RowsAffected == 0 {
			return nil
		}
		if err := tx.Model(mUser).Update("following_count", gorm.Expr("following_count - 1")).Error; err != nil {
			return err
		}
		if err := tx.Model(&mTargetUser).Update("follower_count", gorm.Expr("follower_count - 1")).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		return fmt.Errorf("failed to unfollow user %s: %w", targetUsername, err)
	}
	return nil
}
