package model

// Recording is the model for project recording videos.
type Recording struct {
	Model

	// OwnerID is the ID of the user who created the recording.
	OwnerID int64 `gorm:"column:owner_id;index"`
	Owner   User  `gorm:"foreignKey:OwnerID"`

	// ProjectID is the ID of the project that the recording is associated with.
	ProjectID int64   `gorm:"column:project_id;index"`
	Project   Project `gorm:"foreignKey:ProjectID"`

	// Title is the display title of the recording.
	Title string `gorm:"column:title"`

	// Description is the brief description of the recording.
	Description string `gorm:"column:description"`

	// VideoURL is the URL of the recorded video file.
	VideoURL string `gorm:"column:video_url"`

	// ThumbnailURL is the URL of the thumbnail image.
	ThumbnailURL string `gorm:"column:thumbnail_url"`

	// ViewCount is the number of times the recording has been viewed.
	ViewCount int64 `gorm:"column:view_count;index"`

	// LikeCount is the number of times the recording has been liked.
	LikeCount int64 `gorm:"column:like_count;index"`
}
// TableName implements [gorm.io/gorm/schema.Tabler].
func (Recording) TableName() string {
	return "recording"
}