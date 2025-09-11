package model

import (
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"errors"
)

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

	// MobileKeyboardType is the type of mobile keyboard adaptation.
	// 1: No keyboard needed 
	// 2: Custom keyboard
	MobileKeyboardType int `gorm:"column:mobile_keyboard_type;not null;default:1"`

	// MobileKeyboardZoneToKey contains the mapping from zone ID to key name.
	// Only applicable when MobileKeyboardType is 2 (custom keyboard).
	MobileKeyboardZoneToKey MobileKeyboardZoneToKeyMapping `gorm:"column:mobile_keyboard_zone_to_key;type:json"`

	// Migration only fields. Do not use in application code.
	MO__deleted_at_is_null _deleted_at_is_null `gorm:"->:false;<-:false;column:_deleted_at_is_null;index:,composite:owner_id_name,unique"`
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (Project) TableName() string {
	return "project"
}

// IsNoKeyboard returns true if the mobile keyboard type indicates no keyboard is needed.
func (p *Project) IsNoKeyboard() bool {
	return p.MobileKeyboardType == 1
}

// IsCustomKeyboard returns true if the mobile keyboard type indicates custom keyboard is needed.
func (p *Project) IsCustomKeyboard() bool {
	return p.MobileKeyboardType == 2
}

// MobileKeyboardZoneId represents the zone ID type for virtual keyboard.
type MobileKeyboardZoneId string

// Zone ID constants for the 10 virtual keyboard zones.
const (
	MobileKeyboardZoneIdLT      MobileKeyboardZoneId = "lt"      // Left Top
	MobileKeyboardZoneIdRT      MobileKeyboardZoneId = "rt"      // Right Top
	MobileKeyboardZoneIdLBUp    MobileKeyboardZoneId = "lbUp"    // Left Bottom Up
	MobileKeyboardZoneIdLBLeft  MobileKeyboardZoneId = "lbLeft"  // Left Bottom Left
	MobileKeyboardZoneIdLBRight MobileKeyboardZoneId = "lbRight" // Left Bottom Right
	MobileKeyboardZoneIdLBDown  MobileKeyboardZoneId = "lbDown"  // Left Bottom Down
	MobileKeyboardZoneIdRBA     MobileKeyboardZoneId = "rbA"     // Right Bottom A
	MobileKeyboardZoneIdRBB     MobileKeyboardZoneId = "rbB"     // Right Bottom B
	MobileKeyboardZoneIdRBX     MobileKeyboardZoneId = "rbX"     // Right Bottom X
	MobileKeyboardZoneIdRBY     MobileKeyboardZoneId = "rbY"     // Right Bottom Y
)

// AllMobileKeyboardZoneIds returns all valid zone IDs.
func AllMobileKeyboardZoneIds() []MobileKeyboardZoneId {
	return []MobileKeyboardZoneId{
		MobileKeyboardZoneIdLT, MobileKeyboardZoneIdRT, MobileKeyboardZoneIdLBUp, MobileKeyboardZoneIdLBLeft, MobileKeyboardZoneIdLBRight,
		MobileKeyboardZoneIdLBDown, MobileKeyboardZoneIdRBA, MobileKeyboardZoneIdRBB, MobileKeyboardZoneIdRBX, MobileKeyboardZoneIdRBY,
	}
}

// IsValid checks if the zone ID is valid.
func (z MobileKeyboardZoneId) IsValid() bool {
	for _, validZone := range AllMobileKeyboardZoneIds() {
		if z == validZone {
			return true
		}
	}
	return false
}

// MobileKeyboardZoneToKeyMapping is a map from zone ID to key name.
// Key name can be null (represented as nil pointer) if the zone is not mapped to any key.
type MobileKeyboardZoneToKeyMapping map[MobileKeyboardZoneId]*string

// Scan implements [sql.Scanner].
func (ztkm *MobileKeyboardZoneToKeyMapping) Scan(src any) error {
	switch src := src.(type) {
	case string:
		if src == "" {
			*ztkm = make(MobileKeyboardZoneToKeyMapping)
			return nil
		}
		return json.Unmarshal([]byte(src), ztkm)
	case []byte:
		if len(src) == 0 {
			*ztkm = make(MobileKeyboardZoneToKeyMapping)
			return nil
		}
		return json.Unmarshal(src, ztkm)
	case nil:
		*ztkm = make(MobileKeyboardZoneToKeyMapping)
		return nil
	default:
		return errors.New("incompatible type for MobileKeyboardZoneToKeyMapping")
	}
}

// Value implements [driver.Valuer].
func (ztkm MobileKeyboardZoneToKeyMapping) Value() (driver.Value, error) {
	if ztkm == nil {
		return nil, nil
	}
	return json.Marshal(ztkm)
}
