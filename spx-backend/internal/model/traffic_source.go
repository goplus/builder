package model

// TrafficSource is the model for traffic source tracking records.
type TrafficSource struct {
	Model

	// Platform is the source platform (wechat, qq, douyin, xiaohongshu, bilibili).
	Platform string `gorm:"column:platform;size:20;index"`

	// UserID is the ID of the user (nullable for anonymous users).
	UserID *int64 `gorm:"column:user_id;index"`
	User   *User  `gorm:"foreignKey:UserID"`

	// IPAddress is the IP address of the visitor.
	IPAddress string `gorm:"column:ip_address;size:45;index"`
}

// TableName implements [gorm.io/gorm/schema.Tabler].
func (TrafficSource) TableName() string {
	return "traffic_source"
}