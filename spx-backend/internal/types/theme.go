package types

// ThemeType represents different SVG generation themes
type ThemeType string

const (
	ThemeNone      ThemeType = ""
	ThemeCartoon   ThemeType = "cartoon"
	ThemeRealistic ThemeType = "realistic"  
	ThemeMinimal   ThemeType = "minimal"
	ThemeFantasy   ThemeType = "fantasy"
	ThemeRetro     ThemeType = "retro"
	ThemeScifi     ThemeType = "scifi"
	ThemeNature    ThemeType = "nature"
	ThemeBusiness  ThemeType = "business"
)

// ThemeDescriptions maps each theme to its description
var ThemeDescriptions = map[ThemeType]string{
	ThemeNone:      "不应用任何特定主题风格",
	ThemeCartoon:   "色彩鲜艳的卡通风格，适合可爱有趣的内容",
	ThemeRealistic: "高度写实的风格，细节丰富逼真",
	ThemeMinimal:   "极简主义风格，简洁干净的设计",
	ThemeFantasy:   "充满魔法和超自然元素的奇幻风格",
	ThemeRetro:     "怀旧复古风格，经典老式美学",
	ThemeScifi:     "未来科技风格，充满科幻元素",
	ThemeNature:    "自然有机风格，使用自然元素和大地色调",
	ThemeBusiness:  "专业商务风格，现代企业形象",
}

// IsValidTheme checks if the given theme is valid
func IsValidTheme(theme ThemeType) bool {
	if theme == ThemeNone {
		return true
	}
	_, exists := ThemeDescriptions[theme]
	return exists
}