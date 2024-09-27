package model

// ProjectRelease is the model for project releases.
type ProjectRelease struct {
	Model

	// ProjectID is the ID of the project that the release is associated with.
	ProjectID int64   `gorm:"column:project_id;index;index:,composite:project_id_name,unique"`
	Project   Project `gorm:"foreignKey:ProjectID"`

	// Name is the unique name of the project release.
	Name string `gorm:"column:name;index:,class:FULLTEXT;index:,composite:project_id_name,unique"`

	// Description is the brief description.
	Description string `gorm:"column:description"`

	// Files contains file paths and their corresponding universal URLs
	// associated with the release.
	Files FileCollection `gorm:"column:files"`

	// Thumbnail is the URL of the thumbnail image.
	Thumbnail string `gorm:"column:thumbnail"`

	// RemixCount is the number of times the release has been remixed.
	RemixCount int64 `gorm:"column:remix_count;index"`
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (ProjectRelease) TableName() string {
	return "project_release"
}
