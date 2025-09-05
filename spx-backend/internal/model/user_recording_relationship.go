package model

import (
	"context"
	"database/sql"
	"fmt"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// UserRecordingRelationship is the model for user-recording relationships.
type UserRecordingRelationship struct {
	Model

	// UserID is the ID of the user involved in the relationship.
	UserID int64 `gorm:"column:user_id;index;index:,composite:user_id_recording_id,unique"`
	User   User  `gorm:"foreignKey:UserID"`

	// RecordingID is the ID of the recording involved in the relationship.
	RecordingID int64  `gorm:"column:recording_id;index;index:,composite:user_id_recording_id,unique"`
	Recording   Recording `gorm:"foreignKey:RecordingID"`

	// ViewCount is the number of times the user has viewed the recording.
	ViewCount int64 `gorm:"column:view_count;index"`

	// LastViewedAt is the time when the user last viewed the recording.
	//
	// If LastViewedAt.Valid is false, it means the user has not viewed the recording.
	LastViewedAt sql.NullTime `gorm:"column:last_viewed_at;index"`

	// LikedAt is the time when the user liked the recording.
	//
	// If LikedAt.Valid is false, it means the user has not liked the recording.
	LikedAt sql.NullTime `gorm:"column:liked_at;index"`
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (UserRecordingRelationship) TableName() string {
	return "user_recording_relationship"
}

// FirstOrCreateUserRecordingRelationship gets or creates a user-recording relationship.
func FirstOrCreateUserRecordingRelationship(ctx context.Context, db *gorm.DB, userID, recordingID int64) (*UserRecordingRelationship, error) {
	var mUserRecordingRelationship UserRecordingRelationship
	if err := db.WithContext(ctx).
		Where("user_id = ?", userID).
		Where("recording_id = ?", recordingID).
		Attrs(UserRecordingRelationship{UserID: userID, RecordingID: recordingID}).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "user_id"}, {Name: "recording_id"}},
			DoNothing: true,
		}).
		FirstOrCreate(&mUserRecordingRelationship).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get/create user-recording relationship: %w", err)
	}
	if mUserRecordingRelationship.ID == 0 {
		// Unfortunately, MySQL doesn't support the RETURNING clause.
		if err := db.WithContext(ctx).
			Where("user_id = ?", userID).
			Where("recording_id = ?", recordingID).
			First(&mUserRecordingRelationship).
			Error; err != nil {
			return nil, fmt.Errorf("failed to get user-recording relationship: %w", err)
		}
	}
	return &mUserRecordingRelationship, nil
}