package model

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

// ParseAssetType parses the string representation of the asset type.
func ParseAssetType(s string) AssetType {
	switch s {
	case "sprite":
		return AssetTypeSprite
	case "backdrop":
		return AssetTypeBackdrop
	case "sound":
		return AssetTypeSound
	}
	return 255
}

// String implements [fmt.Stringer]. It returns the string representation of the
// asset type.
func (at AssetType) String() string {
	switch at {
	case AssetTypeSprite:
		return "sprite"
	case AssetTypeBackdrop:
		return "backdrop"
	case AssetTypeSound:
		return "sound"
	}
	return "unknown"
}
