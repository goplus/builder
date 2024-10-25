package model

import (
	"database/sql"

	"gorm.io/gorm"
)

// Project is the model for projects.
type Project struct {
	Model

	// OwnerID is the ID of the project owner.
	OwnerID int64 `gorm:"column:owner_id;index;index:,composite:owner_id_name"`
	Owner   User  `gorm:"foreignKey:OwnerID"`

	// RemixedFromReleaseID is the ID of the project release from which the
	// project is remixed.
	//
	// If RemixedFromReleaseID.Valid is false, it means the project is not a
	// remix.
	RemixedFromReleaseID sql.NullInt64   `gorm:"column:remixed_from_release_id;index"`
	RemixedFromRelease   *ProjectRelease `gorm:"foreignKey:RemixedFromReleaseID"`

	// Name is the unique name.
	Name string `gorm:"column:name;index:,class:FULLTEXT;index:,composite:owner_id_name"`

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
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (Project) TableName() string {
	return "project"
}

func (Project) AfterMigrate(tx *gorm.DB) error {
	for _, sql := range []string{
		"DROP TRIGGER IF EXISTS trg_project_before_insert",
		`
CREATE TRIGGER trg_project_before_insert
BEFORE INSERT ON project
FOR EACH ROW
BEGIN
	IF NEW.deleted_at IS NULL
	AND EXISTS (
		SELECT id FROM project
		WHERE owner_id = NEW.owner_id
		AND name = NEW.name
		AND deleted_at IS NULL
	) THEN
		SIGNAL SQLSTATE '45000'
		SET MESSAGE_TEXT = 'Duplicate entry: An active record with same owner_id and name already exists';
	END IF;
END
		`,

		"DROP TRIGGER IF EXISTS trg_project_before_update",
		`
CREATE TRIGGER trg_project_before_update
BEFORE UPDATE ON project
FOR EACH ROW
BEGIN
	IF (NEW.owner_id <> OLD.owner_id OR NEW.name <> OLD.name)
	AND NEW.deleted_at IS NULL
	AND EXISTS (
		SELECT id FROM project
		WHERE owner_id = NEW.owner_id
		AND name = NEW.name
		AND deleted_at IS NULL
		AND id != NEW.id
	) THEN
		SIGNAL SQLSTATE '45000'
		SET MESSAGE_TEXT = 'Duplicate entry: An active record with same owner_id and name already exists';
	END IF;
END
		`,
	} {
		if err := tx.Exec(sql).Error; err != nil {
			return err
		}
	}
	return nil
}
