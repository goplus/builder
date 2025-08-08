package controller

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/authz"
	"github.com/goplus/builder/spx-backend/internal/model"
	"gorm.io/gorm"
)

// UserDTO is the DTO for users.
type UserDTO struct {
	ModelDTO

	Username           string                  `json:"username"`
	DisplayName        string                  `json:"displayName"`
	Avatar             string                  `json:"avatar"`
	Description        string                  `json:"description"`
	Plan               model.UserPlan          `json:"plan"`
	FollowerCount      int64                   `json:"followerCount"`
	FollowingCount     int64                   `json:"followingCount"`
	ProjectCount       int64                   `json:"projectCount"`
	PublicProjectCount int64                   `json:"publicProjectCount"`
	LikedProjectCount  int64                   `json:"likedProjectCount"`
	Capabilities       *authz.UserCapabilities `json:"capabilities,omitempty"`
}

// toUserDTO converts the model user to its DTO.
func toUserDTO(mUser model.User) UserDTO {
	return UserDTO{
		ModelDTO:           toModelDTO(mUser.Model),
		Username:           mUser.Username,
		DisplayName:        mUser.DisplayName,
		Avatar:             mUser.Avatar,
		Description:        mUser.Description,
		Plan:               mUser.Plan,
		FollowerCount:      mUser.FollowerCount,
		FollowingCount:     mUser.FollowingCount,
		ProjectCount:       mUser.ProjectCount,
		PublicProjectCount: mUser.PublicProjectCount,
		LikedProjectCount:  mUser.LikedProjectCount,
	}
}

// toUserDTOWithCapabilities converts the model user to its DTO with capabilities.
func toUserDTOWithCapabilities(mUser model.User, caps authz.UserCapabilities) UserDTO {
	userDTO := toUserDTO(mUser)
	userDTO.Capabilities = &caps
	return userDTO
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
		SortOrder:  SortOrderAsc,
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
	if mAuthenticatedUser, ok := authn.UserFromContext(ctx); ok && mAuthenticatedUser.Username == username {
		mUser = *mAuthenticatedUser
	} else if err := ctrl.db.WithContext(ctx).
		Where("username = ?", username).
		First(&mUser).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get user %q: %w", username, err)
	}
	userDTO := toUserDTO(mUser)
	return &userDTO, nil
}

// GetAuthenticatedUser retrieves the authenticated user from the context.
func (ctrl *Controller) GetAuthenticatedUser(ctx context.Context) (*UserDTO, error) {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return nil, authn.ErrUnauthorized
	}
	caps, ok := authz.UserCapabilitiesFromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("missing user capabilities in context for user %q", mUser.Username)
	}
	userDTO := toUserDTOWithCapabilities(*mUser, caps)
	return &userDTO, nil
}

// UpdateAuthenticatedUserParams holds parameters for updating the authenticated user.
type UpdateAuthenticatedUserParams struct {
	Description string
}

// Validate validates the parameters.
func (p *UpdateAuthenticatedUserParams) Validate() (ok bool, msg string) {
	return true, ""
}

// Diff returns the updates between the parameters and the model user.
func (p *UpdateAuthenticatedUserParams) Diff(mUser *model.User) map[string]any {
	updates := map[string]any{}
	if p.Description != mUser.Description {
		updates["description"] = p.Description
	}
	return updates
}

// UpdateAuthenticatedUser updates the authenticated user.
func (ctrl *Controller) UpdateAuthenticatedUser(ctx context.Context, params *UpdateAuthenticatedUserParams) (*UserDTO, error) {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return nil, authn.ErrUnauthorized
	}
	updates := params.Diff(mUser)
	if len(updates) > 0 {
		if err := ctrl.db.WithContext(ctx).Model(mUser).Updates(updates).Error; err != nil {
			return nil, fmt.Errorf("failed to update authenticated user %q: %w", mUser.Username, err)
		}
	}
	caps, ok := authz.UserCapabilitiesFromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("missing user capabilities in context for user %q", mUser.Username)
	}
	userDTO := toUserDTOWithCapabilities(*mUser, caps)
	return &userDTO, nil
}

// FollowUser follows the target user as the authenticated user.
func (ctrl *Controller) FollowUser(ctx context.Context, targetUsername string) error {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return authn.ErrUnauthorized
	}
	if mUser.Username == targetUsername {
		return ErrBadRequest
	}

	var mTargetUser model.User
	if err := ctrl.db.WithContext(ctx).
		Where("username = ?", targetUsername).
		First(&mTargetUser).
		Error; err != nil {
		return fmt.Errorf("failed to get target user %q: %w", targetUsername, err)
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
		if err := tx.Model(mUser).UpdateColumn("following_count", gorm.Expr("following_count + 1")).Error; err != nil {
			return err
		}
		if err := tx.Model(&mTargetUser).UpdateColumn("follower_count", gorm.Expr("follower_count + 1")).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		return fmt.Errorf("failed to follow user %q: %w", targetUsername, err)
	}
	return nil
}

// IsFollowingUser checks if the authenticated user is following the target user.
func (ctrl *Controller) IsFollowingUser(ctx context.Context, targetUsername string) (bool, error) {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return false, authn.ErrUnauthorized
	}
	if mUser.Username == targetUsername {
		return false, ErrBadRequest
	}

	var mTargetUser model.User
	if err := ctrl.db.WithContext(ctx).
		Where("username = ?", targetUsername).
		First(&mTargetUser).
		Error; err != nil {
		return false, fmt.Errorf("failed to get target user %q: %w", targetUsername, err)
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
		return false, fmt.Errorf("failed to check if user %q is following user %q: %w", mUser.Username, targetUsername, err)
	}
	return true, nil
}

// UnfollowUser unfollows the target user as the authenticated user.
func (ctrl *Controller) UnfollowUser(ctx context.Context, targetUsername string) error {
	mUser, ok := authn.UserFromContext(ctx)
	if !ok {
		return authn.ErrUnauthorized
	}
	if mUser.Username == targetUsername {
		return ErrBadRequest
	}

	var mTargetUser model.User
	if err := ctrl.db.WithContext(ctx).
		Where("username = ?", targetUsername).
		First(&mTargetUser).
		Error; err != nil {
		return fmt.Errorf("failed to get target user %q: %w", targetUsername, err)
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
		if err := tx.Model(mUser).UpdateColumn("following_count", gorm.Expr("following_count - 1")).Error; err != nil {
			return err
		}
		if err := tx.Model(&mTargetUser).UpdateColumn("follower_count", gorm.Expr("follower_count - 1")).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		return fmt.Errorf("failed to unfollow user %q: %w", targetUsername, err)
	}
	return nil
}
