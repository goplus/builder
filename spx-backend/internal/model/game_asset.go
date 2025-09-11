package model

// GameAsset represents a game asset for auto-completion
type GameAsset struct {
	Model
	Name string `json:"name" gorm:"type:varchar(255);not null;index"` // 素材名称，用于补全
}
