package model

import (
	"context"
	"database/sql"
	"fmt"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// UserRelationship is the model for user relationships.
type UserRelationship struct {
	Model

	// UserID is the ID of the user involved in the relationship.
	UserID int64 `gorm:"column:user_id;index;index:,composite:user_id_target_user_id,unique"`
	User   User  `gorm:"foreignKey:UserID"`

	// TargetUserID is the ID of the target user involved in the relationship.
	TargetUserID int64 `gorm:"column:target_user_id;index;index:,composite:user_id_target_user_id,unique"`
	TargetUser   User  `gorm:"foreignKey:TargetUserID"`

	// FollowedAt is the time when the user followed the target user.
	//
	// If FollowedAt.Valid is false, it means the user is not following the
	// target user.
	FollowedAt sql.NullTime `gorm:"column:followed_at;index"`
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (UserRelationship) TableName() string {
	return "user_relationship"
}

// FirstOrCreateUserRelationship gets or creates a user relationship.
func FirstOrCreateUserRelationship(ctx context.Context, db *gorm.DB, userID, targetUserID int64) (*UserRelationship, error) {
	var mUserRelationship UserRelationship
	if err := db.WithContext(ctx).
		Where("user_id = ?", userID).
		Where("target_user_id = ?", targetUserID).
		Attrs(UserRelationship{UserID: userID, TargetUserID: targetUserID}).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "user_id"}, {Name: "target_user_id"}},
			DoNothing: true,
		}).
		FirstOrCreate(&mUserRelationship).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get/create user relationship: %w", err)
	}
	if mUserRelationship.ID == 0 {
		// Unfortunatlly, MySQL doesn't support the RETURNING clause.
		if err := db.WithContext(ctx).
			Where("user_id = ?", userID).
			Where("target_user_id = ?", targetUserID).
			First(&mUserRelationship).
			Error; err != nil {
			return nil, fmt.Errorf("failed to get user relationship: %w", err)
		}
	}
	return &mUserRelationship, nil
}
