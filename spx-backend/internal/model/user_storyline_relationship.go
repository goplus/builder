package model

// UserStorylineRelationship is the model for user-storyline relationships.
type UserStorylineRelationship struct {
	Model

	// UserID is the user ID.
	UserID int64 `gorm:"column:user_id"`

	// StorylineID is the storyline ID.
	StorylineID int64 `gorm:"column:storyline_id"`

	// LastFinishedLevelIndex is the last finished level index.
	LastFinishedLevelIndex int8 `gorm:"column:last_finished_level_index"`
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (UserStorylineRelationship) TableName() string {
	return "user_storyline_relationship"
}
