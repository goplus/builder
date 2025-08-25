package model

// Record is the model for project recording videos.
type Record struct {
	Model

	// UserID is the ID of the user who created the record.
	UserID int64 `gorm:"column:user_id;index"`
	User   User  `gorm:"foreignKey:UserID"`

	// ProjectID is the ID of the project that the record is associated with.
	ProjectID int64   `gorm:"column:project_id;index"`
	Project   Project `gorm:"foreignKey:ProjectID"`

	// Title is the display title of the record.
	Title string `gorm:"column:title"`

	// Description is the brief description of the record.
	Description string `gorm:"column:description"`

	// VideoURL is the URL of the recorded video file.
	VideoURL string `gorm:"column:video_url"`

	// ThumbnailURL is the URL of the thumbnail image.
	ThumbnailURL string `gorm:"column:thumbnail_url"`

	// ViewCount is the number of times the record has been viewed.
	ViewCount int64 `gorm:"column:view_count;index"`

	// LikeCount is the number of times the record has been liked.
	LikeCount int64 `gorm:"column:like_count;index"`
}
// TableName implements [gorm.io/gorm/schema.Tabler].
func (Record) TableName() string {
	return "record"
}