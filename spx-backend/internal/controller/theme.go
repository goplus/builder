package controller

import (
	"fmt"

	"github.com/goplus/builder/spx-backend/internal/svggen"
)

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

// ThemeInfo represents detailed information about a theme
type ThemeInfo struct {
	ID                  ThemeType       `json:"id"`
	Name                string          `json:"name"`
	Description         string          `json:"description"`
	Prompt              string          `json:"prompt"`
	RecommendedProvider svggen.Provider `json:"recommended_provider"`
}

// ThemePrompts maps each theme to its corresponding prompt enhancement
var ThemePrompts = map[ThemeType]string{
	ThemeCartoon:   "必须使用卡通风格，必须色彩鲜艳丰富，必须可爱有趣，严格使用简单几何形状，强制使用明亮饱和的色彩，禁止写实细节",
	ThemeRealistic: "必须使用写实风格，严格要求高度细节化，强制逼真效果，必须专业高质量渲染，禁止卡通化或简化元素",
	ThemeMinimal:   "必须使用极简风格，严格限制元素数量，强制使用干净线条和几何形状，严格使用黑白或单色调，禁止复杂装饰",
	ThemeFantasy:   "必须使用奇幻魔法风格，强制添加神秘魔法元素，严格使用梦幻色彩，必须包含超自然效果，禁止现实主义元素",
	ThemeRetro:     "必须使用复古怀旧风格，严格遵循经典老式美学，强制使用怀旧色调和设计元素，禁止现代化元素",
	ThemeScifi:     "必须使用科幻未来风格，强制添加科技元素，严格使用霓虹和金属色彩，必须包含未来感设计，禁止传统元素",
	ThemeNature:    "必须使用自然有机风格，严格使用自然元素和植物，强制使用大地色调和绿色系，禁止人工几何元素",
	ThemeBusiness:  "必须使用商务专业风格，严格保持企业形象，强制使用现代简洁设计，必须专业精致，禁止卡通或娱乐元素",
}

// ThemeNames maps each theme to its Chinese name
var ThemeNames = map[ThemeType]string{
	ThemeNone:      "无主题",
	ThemeCartoon:   "卡通风格",
	ThemeRealistic: "写实风格",
	ThemeMinimal:   "极简风格",
	ThemeFantasy:   "奇幻风格",
	ThemeRetro:     "复古风格",
	ThemeScifi:     "科幻风格",
	ThemeNature:    "自然风格",
	ThemeBusiness:  "商务风格",
}

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

// ThemeProviders maps each theme to its recommended provider
var ThemeProviders = map[ThemeType]svggen.Provider{
	ThemeNone:      svggen.ProviderSVGIO,   // Default provider
	ThemeCartoon:   svggen.ProviderRecraft, // Recraft excels at cartoon styles
	ThemeRealistic: svggen.ProviderRecraft, // Recraft is good for realistic styles
	ThemeMinimal:   svggen.ProviderSVGIO,   // SVGIO works well for minimal styles
	ThemeFantasy:   svggen.ProviderRecraft, // Recraft handles fantasy well
	ThemeRetro:     svggen.ProviderRecraft, // Recraft for retro styles
	ThemeScifi:     svggen.ProviderRecraft, // Recraft for sci-fi
	ThemeNature:    svggen.ProviderRecraft, // Recraft for nature themes
	ThemeBusiness:  svggen.ProviderRecraft, // Recraft for business styles
}

// IsValidTheme checks if the given theme is valid
func IsValidTheme(theme ThemeType) bool {
	if theme == ThemeNone {
		return true
	}
	_, exists := ThemePrompts[theme]
	return exists
}

// GetThemePromptEnhancement returns the prompt enhancement for a given theme
func GetThemePromptEnhancement(theme ThemeType) string {
	if theme == ThemeNone {
		return ""
	}
	return ThemePrompts[theme]
}

// GetThemeRecommendedProvider returns the recommended provider for a given theme
func GetThemeRecommendedProvider(theme ThemeType) svggen.Provider {
	if provider, exists := ThemeProviders[theme]; exists {
		return provider
	}
	return svggen.ProviderSVGIO // Default fallback
}

// ApplyThemeToPrompt applies theme enhancement to the original prompt
func ApplyThemeToPrompt(originalPrompt string, theme ThemeType) string {
	if theme == ThemeNone {
		return originalPrompt
	}

	themeEnhancement := GetThemePromptEnhancement(theme)
	if themeEnhancement == "" {
		return originalPrompt
	}

	return fmt.Sprintf("%s，%s", originalPrompt, themeEnhancement)
}

// GetAvailableThemes returns all available themes
func GetAvailableThemes() []ThemeType {
	return []ThemeType{
		ThemeNone,
		ThemeCartoon,
		ThemeRealistic,
		ThemeMinimal,
		ThemeFantasy,
		ThemeRetro,
		ThemeScifi,
		ThemeNature,
		ThemeBusiness,
	}
}

// GetThemeInfo returns detailed information for a specific theme
func GetThemeInfo(theme ThemeType) ThemeInfo {
	return ThemeInfo{
		ID:                  theme,
		Name:                ThemeNames[theme],
		Description:         ThemeDescriptions[theme],
		Prompt:              ThemePrompts[theme],
		RecommendedProvider: GetThemeRecommendedProvider(theme),
	}
}

// GetAllThemesInfo returns detailed information for all themes
func GetAllThemesInfo() []ThemeInfo {
	themes := GetAvailableThemes()
	result := make([]ThemeInfo, len(themes))

	for i, theme := range themes {
		result[i] = GetThemeInfo(theme)
	}

	return result
}
