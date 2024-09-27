package model

import (
	"context"
	"database/sql"
	"fmt"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// UserProjectRelationship is the model for user-project relationships.
type UserProjectRelationship struct {
	Model

	// UserID is the ID of the user involved in the relationship.
	UserID int64 `gorm:"column:user_id;index;index:,composite:user_id_project_id,unique"`
	User   User  `gorm:"foreignKey:UserID"`

	// ProjectID is the ID of the project involved in the relationship.
	ProjectID int64   `gorm:"column:project_id;index;index:,composite:user_id_project_id,unique"`
	Project   Project `gorm:"foreignKey:ProjectID"`

	// ViewCount is the number of times the user has viewed the project.
	ViewCount int64 `gorm:"column:view_count;index"`

	// LastViewedAt is the time when the user last viewed the project.
	//
	// If LastViewedAt.Valid is false, it means the user has not viewed the project.
	LastViewedAt sql.NullTime `gorm:"column:last_viewed_at;index"`

	// LikedAt is the time when the user liked the project.
	//
	// If LikedAt.Valid is false, it means the user has not liked the project.
	LikedAt sql.NullTime `gorm:"column:liked_at;index"`
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (UserProjectRelationship) TableName() string {
	return "user_project_relationship"
}

// FirstOrCreateUserProjectRelationship gets or creates a user-project relationship.
func FirstOrCreateUserProjectRelationship(ctx context.Context, db *gorm.DB, userID, projectID int64) (*UserProjectRelationship, error) {
	var mUserProjectRelationship UserProjectRelationship
	if err := db.WithContext(ctx).
		Where("user_id = ?", userID).
		Where("project_id = ?", projectID).
		Attrs(UserProjectRelationship{UserID: userID, ProjectID: projectID}).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "user_id"}, {Name: "project_id"}},
			DoNothing: true,
		}).
		FirstOrCreate(&mUserProjectRelationship).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get/create user-project relationship: %w", err)
	}
	if mUserProjectRelationship.ID == 0 {
		// Unfortunatlly, MySQL doesn't support the RETURNING clause.
		if err := db.WithContext(ctx).
			Where("user_id = ?", userID).
			Where("project_id = ?", projectID).
			First(&mUserProjectRelationship).
			Error; err != nil {
			return nil, fmt.Errorf("failed to get user-project relationship: %w", err)
		}
	}
	return &mUserProjectRelationship, nil
}
