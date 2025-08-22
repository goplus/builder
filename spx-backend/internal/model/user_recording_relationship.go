package model

import (
	"context"
	"database/sql"
	"fmt"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// UserRecordRelationship is the model for user-record relationships.
type UserRecordRelationship struct {
	Model

	// UserID is the ID of the user involved in the relationship.
	UserID int64 `gorm:"column:user_id;index;index:,composite:user_id_record_id,unique"`
	User   User  `gorm:"foreignKey:UserID"`

	// RecordID is the ID of the record involved in the relationship.
	RecordID int64  `gorm:"column:record_id;index;index:,composite:user_id_record_id,unique"`
	Record   Record `gorm:"foreignKey:RecordID"`

	// ViewCount is the number of times the user has viewed the record.
	ViewCount int64 `gorm:"column:view_count;index"`

	// LastViewedAt is the time when the user last viewed the record.
	//
	// If LastViewedAt.Valid is false, it means the user has not viewed the record.
	LastViewedAt sql.NullTime `gorm:"column:last_viewed_at;index"`

	// LikedAt is the time when the user liked the record.
	//
	// If LikedAt.Valid is false, it means the user has not liked the record.
	LikedAt sql.NullTime `gorm:"column:liked_at;index"`
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (UserRecordRelationship) TableName() string {
	return "user_record_relationship"
}

// FirstOrCreateUserRecordRelationship gets or creates a user-record relationship.
func FirstOrCreateUserRecordRelationship(ctx context.Context, db *gorm.DB, userID, recordID int64) (*UserRecordRelationship, error) {
	var mUserRecordRelationship UserRecordRelationship
	if err := db.WithContext(ctx).
		Where("user_id = ?", userID).
		Where("record_id = ?", recordID).
		Attrs(UserRecordRelationship{UserID: userID, RecordID: recordID}).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "user_id"}, {Name: "record_id"}},
			DoNothing: true,
		}).
		FirstOrCreate(&mUserRecordRelationship).
		Error; err != nil {
		return nil, fmt.Errorf("failed to get/create user-record relationship: %w", err)
	}
	if mUserRecordRelationship.ID == 0 {
		// Unfortunately, MySQL doesn't support the RETURNING clause.
		if err := db.WithContext(ctx).
			Where("user_id = ?", userID).
			Where("record_id = ?", recordID).
			First(&mUserRecordRelationship).
			Error; err != nil {
			return nil, fmt.Errorf("failed to get user-record relationship: %w", err)
		}
	}
	return &mUserRecordRelationship, nil
}