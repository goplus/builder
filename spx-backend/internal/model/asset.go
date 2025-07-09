package model

import "fmt"

// Asset is the model for assets.
type Asset struct {
	Model

	// OwnerID is the ID of the asset owner.
	OwnerID int64 `gorm:"column:owner_id;index"`
	Owner   User  `gorm:"foreignKey:OwnerID"`

	// DisplayName is the display name.
	DisplayName string `gorm:"column:display_name;index:,class:FULLTEXT"`

	// Type is the type of the asset.
	Type AssetType `gorm:"column:type;index"`

	// Category is the category to which the asset belongs.
	Category string `gorm:"column:category;index"`

	// Files contains the file paths and their corresponding universal URLs
	// associated with the asset.
	Files FileCollection `gorm:"column:files"`

	// FilesHash is the hash of the asset files.
	FilesHash string `gorm:"column:files_hash"`

	// Visibility is the visibility.
	Visibility Visibility `gorm:"column:visibility;index"`
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (Asset) TableName() string {
	return "asset"
}

// AssetType is the type of asset.
type AssetType uint8

const (
	AssetTypeSprite AssetType = iota
	AssetTypeBackdrop
	AssetTypeSound
)

// ParseAssetType parses the string representation of an asset type.
func ParseAssetType(s string) (AssetType, error) {
	var at AssetType
	return at, at.UnmarshalText([]byte(s))
}

// String implements [fmt.Stringer].
func (at AssetType) String() string {
	if text, err := at.MarshalText(); err == nil {
		return string(text)
	}
	return fmt.Sprintf("AssetType(%d)", at)
}

// MarshalText implements [encoding.TextMarshaler].
func (at AssetType) MarshalText() ([]byte, error) {
	switch at {
	case AssetTypeSprite:
		return []byte("sprite"), nil
	case AssetTypeBackdrop:
		return []byte("backdrop"), nil
	case AssetTypeSound:
		return []byte("sound"), nil
	default:
		return nil, fmt.Errorf("invalid asset type: %d", at)
	}
}

// UnmarshalText implements [encoding.TextUnmarshaler].
func (at *AssetType) UnmarshalText(text []byte) error {
	switch string(text) {
	case "sprite":
		*at = AssetTypeSprite
	case "backdrop":
		*at = AssetTypeBackdrop
	case "sound":
		*at = AssetTypeSound
	default:
		return fmt.Errorf("invalid asset type: %s", text)
	}
	return nil
}
