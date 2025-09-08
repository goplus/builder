package model

import "database/sql"

// Project is the model for projects.
type Project struct {
	Model

	// OwnerID is the ID of the project owner.
	OwnerID int64 `gorm:"column:owner_id;index;index:,composite:owner_id_name,unique"`
	Owner   User  `gorm:"foreignKey:OwnerID"`

	// RemixedFromReleaseID is the ID of the project release from which the
	// project is remixed.
	//
	// If RemixedFromReleaseID.Valid is false, it means the project is not a
	// remix.
	RemixedFromReleaseID sql.NullInt64   `gorm:"column:remixed_from_release_id;index"`
	RemixedFromRelease   *ProjectRelease `gorm:"foreignKey:RemixedFromReleaseID"`

	// LatestReleaseID is the ID of the latest project release.
	LatestReleaseID sql.NullInt64   `gorm:"column:latest_release_id;index"`
	LatestRelease   *ProjectRelease `gorm:"foreignKey:LatestReleaseID"`

	// Name is the unique name.
	Name string `gorm:"column:name;index:,class:FULLTEXT;index:,composite:owner_id_name,unique"`

	// Version is the version number.
	Version int `gorm:"column:version"`

	// Files contains the file paths and their corresponding universal URLs
	// associated with the project.
	Files FileCollection `gorm:"column:files"`

	// Visibility is the visibility.
	Visibility Visibility `gorm:"column:visibility;index"`

	// Description is the brief description.
	Description string `gorm:"column:description"`

	// Instructions is the instructions on how to interact with the project.
	Instructions string `gorm:"column:instructions"`

	// Thumbnail is the URL of the thumbnail image.
	Thumbnail string `gorm:"column:thumbnail"`

	// ViewCount is the number of times the project has been viewed.
	ViewCount int64 `gorm:"column:view_count;index"`

	// LikeCount is the number of times the project has been liked.
	LikeCount int64 `gorm:"column:like_count;index"`

	// ReleaseCount is the number of releases associated with the project.
	ReleaseCount int64 `gorm:"column:release_count;index"`

	// RemixCount is the number of times the project has been remixed.
	RemixCount int64 `gorm:"column:remix_count;index"`

	// ProjectContext is the related context information (optional lazy loading)
	ProjectContext *ProjectContext `gorm:"foreignKey:ProjectID"`

	// Migration only fields. Do not use in application code.
	MO__deleted_at_is_null _deleted_at_is_null `gorm:"->:false;<-:false;column:_deleted_at_is_null;index:,composite:owner_id_name,unique"`
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (Project) TableName() string {
	return "project"
}
