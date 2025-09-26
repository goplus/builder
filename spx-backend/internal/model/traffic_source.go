package model

// TrafficSource is the model for traffic source tracking records.
type TrafficSource struct {
	Model

	// Platform is the source platform.
	Platform string `gorm:"column:platform;size:50;index"`

	// AccessCount is the number of times this traffic source has been accessed.
	AccessCount int64 `gorm:"column:access_count;default:0;index"`
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (TrafficSource) TableName() string {
	return "traffic_source"
}
