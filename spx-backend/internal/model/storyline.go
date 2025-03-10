package model

// Storyline is the model for storylines.
type Storyline struct {
	Model

	// BackgroundImage is the image url for the story line
	BackgroundImage string `gorm:"column:background_image"`

	// Name is the unique name.
	Name string `gorm:"column:name"`

	Title string `gorm:"column:title"`

	// Description of the story line and background information
	Description string `gorm:"column:description"`

	// Tag is tag of the storyline.
	Tag StorylineTag `gorm:"column:tag"`

	// Levels is the JSON string of levels.
	Levels string `gorm:"column:levels"`
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (Storyline) TableName() string {
	return "storyline"
}

type StorylineTag uint8

const (
	EasyTag StorylineTag = iota
	MediumTag
	HardTag
)

// ParseStorylineTag parses a string to a StorylineTag.
func ParseStorylineTag(tag string) StorylineTag {
	switch tag {
	case "easy":
		return EasyTag
	case "medium":
		return MediumTag
	case "hard":
		return HardTag
	}
	return 255
}

// String implements [fmt.Stringer].
func (tag StorylineTag) String() string {
	switch tag {
	case EasyTag:
		return "easy"
	case MediumTag:
		return "medium"
	case HardTag:
		return "hard"
	}
	return "unknown"
}
