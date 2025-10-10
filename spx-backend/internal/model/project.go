package model

import (
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"errors"
	"slices"
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

	// MobileKeyboardType defines the mobile keyboard adaptation strategy.
	// 1: No keyboard required (MobileKeyboardTypeNone)
	// 2: Custom virtual keyboard (MobileKeyboardTypeCustom)
	MobileKeyboardType int `gorm:"column:mobile_keyboard_type;not null;default:1"`

	// MobileKeyboardZoneToKey contains the mapping from zone ID to key name.
	// Only applicable when MobileKeyboardType is 2 (custom keyboard).
	MobileKeyboardZoneToKey MobileKeyboardZoneToKeyMapping `gorm:"column:mobile_keyboard_zone_to_key;type:json"`

	// Migration only fields. Do not use in application code.
	MO__deleted_at_is_null _deleted_at_is_null `gorm:"->:false;<-:false;column:_deleted_at_is_null;index:,composite:owner_id_name,unique"`
}

// Mobile keyboard type constants
const (
	MobileKeyboardTypeNone   = 1 // No keyboard required
	MobileKeyboardTypeCustom = 2 // Custom virtual keyboard
)

// TableName implements [gorm.io/gorm/schema.Tabler].
func (Project) TableName() string {
	return "project"
}

// IsNoKeyboard returns true if the mobile keyboard type indicates no keyboard is needed.
func (p *Project) IsNoKeyboard() bool {
	return p.MobileKeyboardType == MobileKeyboardTypeNone
}

// IsCustomKeyboard returns true if the mobile keyboard type indicates custom keyboard is needed.
func (p *Project) IsCustomKeyboard() bool {
	return p.MobileKeyboardType == MobileKeyboardTypeCustom
}

// KeyBtn represents a virtual keyboard button with its position.
type KeyBtn struct {
	// WebKeyValue is the key value (e.g., "Q", "W", "Space")
	WebKeyValue string `json:"webKeyValue"`
	// PosX is the X coordinate of the button
	PosX float64 `json:"posx"`
	// PosY is the Y coordinate of the button
	PosY float64 `json:"posy"`
}

// MobileKeyboardZoneId represents the zone ID type for virtual keyboard.
type MobileKeyboardZoneId string

// Zone ID constants for the 4 virtual keyboard zones.
const (
	MobileKeyboardZoneIdLT MobileKeyboardZoneId = "lt" // Left Top
	MobileKeyboardZoneIdRT MobileKeyboardZoneId = "rt" // Right Top
	MobileKeyboardZoneIdLB MobileKeyboardZoneId = "lb" // Left Bottom
	MobileKeyboardZoneIdRB MobileKeyboardZoneId = "rb" // Right Bottom
)

// AllMobileKeyboardZoneIds returns all valid zone IDs.
func AllMobileKeyboardZoneIds() []MobileKeyboardZoneId {
	return []MobileKeyboardZoneId{
		MobileKeyboardZoneIdLT,
		MobileKeyboardZoneIdRT,
		MobileKeyboardZoneIdLB,
		MobileKeyboardZoneIdRB,
	}
}

// IsValid checks if the zone ID is valid.
func (z MobileKeyboardZoneId) IsValid() bool {
	return slices.Contains(AllMobileKeyboardZoneIds(), z)
}

// MobileKeyboardZoneToKeyMapping is a map from zone ID to key buttons array.
// The value can be:
// - nil: zone is not configured
// - empty array []: zone is configured but has no buttons yet
// - array with buttons: zone has one or more configured buttons
type MobileKeyboardZoneToKeyMapping map[MobileKeyboardZoneId][]KeyBtn

// Scan implements [sql.Scanner].
func (m *MobileKeyboardZoneToKeyMapping) Scan(value any) error {
	if value == nil {
		*m = make(MobileKeyboardZoneToKeyMapping)
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("failed to scan MobileKeyboardZoneToKeyMapping: value is not []byte")
	}

	// First unmarshal to map[string][]KeyBtn
	var temp map[string][]KeyBtn
	if err := json.Unmarshal(bytes, &temp); err != nil {
		return err
	}

	// Convert to map[MobileKeyboardZoneId][]KeyBtn
	result := make(MobileKeyboardZoneToKeyMapping, len(temp))
	for zoneStr, buttons := range temp {
		zone := MobileKeyboardZoneId(zoneStr)
		result[zone] = buttons
	}

	*m = result
	return nil
}

// Value implements [driver.Valuer].
func (m MobileKeyboardZoneToKeyMapping) Value() (driver.Value, error) {
	if m == nil {
		return json.Marshal(map[string][]KeyBtn{})
	}

	// Convert map[MobileKeyboardZoneId][]KeyBtn to map[string][]KeyBtn for JSON
	result := make(map[string][]KeyBtn, len(m))
	for zone, buttons := range m {
		result[string(zone)] = buttons
	}

	return json.Marshal(result)
}
