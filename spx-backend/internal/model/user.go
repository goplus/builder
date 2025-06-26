package model

import (
	"context"
	"fmt"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// User is the model for users.
type User struct {
	Model

	// Username is the unique username.
	Username string `gorm:"column:username;index:,composite:username,unique"`

	// DisplayName is the display name.
	DisplayName string `gorm:"column:display_name"`

	// Avatar is the URL of the avatar image.
	Avatar string `gorm:"column:avatar"`

	// Description is the brief bio or description.
	Description string `gorm:"column:description"`

	// FollowerCount is the number of followers the user has.
	FollowerCount int64 `gorm:"column:follower_count"`

	// FollowingCount is the number of users the user is following.
	FollowingCount int64 `gorm:"column:following_count"`

	// ProjectCount is the total number of projects created by the user.
	ProjectCount int64 `gorm:"column:project_count"`

	// PublicProjectCount is the number of public projects created by the user.
	PublicProjectCount int64 `gorm:"column:public_project_count"`

	// LikedProjectCount is the number of projects liked by the user.
	LikedProjectCount int64 `gorm:"column:liked_project_count"`

	// Migration only fields. Do not use in application code.
	MO__deleted_at_is_null _deleted_at_is_null `gorm:"->:false;<-:false;column:_deleted_at_is_null;index:,composite:username,unique"`
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (User) TableName() string {
	return "user"
}

// CreateUserParams holds parameters for creating a user with [FirstOrCreateUser].
type CreateUserParams struct {
	Username    string
	DisplayName string
	Avatar      string
}

// FirstOrCreateUser gets or creates a user.
func FirstOrCreateUser(ctx context.Context, db *gorm.DB, params CreateUserParams) (*User, error) {
	var mUser User
	if err := db.WithContext(ctx).
		Where("username = ?", params.Username).
		Attrs(User{
			Username:    params.Username,
			DisplayName: params.DisplayName,
			Avatar:      params.Avatar,
		}).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "username"}},
			DoNothing: true,
		}).
		FirstOrCreate(&mUser).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get/create user %q: %w", params.Username, err)
	}
	if mUser.ID == 0 {
		// Unfortunately, MySQL doesn't support the RETURNING clause.
		if err := db.WithContext(ctx).
			Where("username = ?", params.Username).
			First(&mUser).
			Error; err != nil {
			return nil, fmt.Errorf("failed to get user %q: %w", params.Username, err)
		}
	}
	return &mUser, nil
}
