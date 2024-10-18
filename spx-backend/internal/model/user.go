package model

import (
	"context"
	"fmt"

	"github.com/casdoor/casdoor-go-sdk/casdoorsdk"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// User is the model for users.
type User struct {
	Model

	// Username is the unique username.
	Username string `gorm:"column:username;index:,unique,where:deleted_at IS NULL"`

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
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (User) TableName() string {
	return "user"
}

// FirstOrCreateUser gets or creates a user.
func FirstOrCreateUser(ctx context.Context, db *gorm.DB, casdoorUser *casdoorsdk.User) (*User, error) {
	var mUser User
	if err := db.WithContext(ctx).
		Where("username = ?", casdoorUser.Name).
		Attrs(User{
			Username:    casdoorUser.Name,
			DisplayName: casdoorUser.DisplayName,
			Avatar:      casdoorUser.Avatar,
		}).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "username"}},
			DoNothing: true,
		}).
		FirstOrCreate(&mUser).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get/create user %s: %w", casdoorUser.Name, err)
	}
	if mUser.ID == 0 {
		// Unfortunatlly, MySQL doesn't support the RETURNING clause.
		if err := db.WithContext(ctx).
			Where("username = ?", casdoorUser.Name).
			First(&mUser).
			Error; err != nil {
			return nil, fmt.Errorf("failed to get user %s: %w", casdoorUser.Name, err)
		}
	}
	userUpdates := map[string]any{}
	if mUser.DisplayName != casdoorUser.DisplayName {
		userUpdates["display_name"] = casdoorUser.DisplayName
	}
	if mUser.Avatar != casdoorUser.Avatar {
		userUpdates["avatar"] = casdoorUser.Avatar
	}
	if len(userUpdates) > 0 {
		if err := db.WithContext(ctx).Model(&mUser).Updates(userUpdates).Error; err != nil {
			return nil, fmt.Errorf("failed to update user %s: %w", mUser.Username, err)
		}
	}
	return &mUser, nil
}
