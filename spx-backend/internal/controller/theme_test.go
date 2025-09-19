package controller

import (
	"testing"

	"github.com/goplus/builder/spx-backend/internal/svggen"
)

func TestIsValidTheme(t *testing.T) {
	tests := []struct {
		theme    ThemeType
		expected bool
	}{
		{ThemeNone, true},
		{ThemeCartoon, true},
		{ThemeRealistic, true},
		{ThemeMinimal, true},
		{ThemeFantasy, true},
		{ThemeRetro, true},
		{ThemeScifi, true},
		{ThemeNature, true},
		{ThemeBusiness, true},
		{"invalid", false},
		{"", true}, // ThemeNone
	}

	for _, test := range tests {
		result := IsValidTheme(test.theme)
		if result != test.expected {
			t.Errorf("IsValidTheme(%q) = %v, expected %v", test.theme, result, test.expected)
		}
	}
}

func TestGetThemePromptEnhancement(t *testing.T) {
	tests := []struct {
		theme    ThemeType
		expected string
	}{
		{ThemeNone, ""},
		{ThemeCartoon, "采用卡通风格，色彩鲜艳丰富，造型可爱有趣，使用简单几何形状和明亮饱和的色彩"},
		{ThemeRealistic, "采用写实风格，注重细节刻画，追求逼真效果，展现专业高质量的渲染效果"},
		{ThemeMinimal, "采用极简风格，元素精简，线条干净，使用几何形状，色调简洁统一"},
		{ThemeFantasy, "采用奇幻魔法风格，融入神秘元素，使用梦幻色彩，营造超自然的氛围"},
	}

	for _, test := range tests {
		result := GetThemePromptEnhancement(test.theme)
		if result != test.expected {
			t.Errorf("GetThemePromptEnhancement(%q) = %q, expected %q", test.theme, result, test.expected)
		}
	}
}

func TestApplyThemeToPrompt(t *testing.T) {
	tests := []struct {
		prompt   string
		theme    ThemeType
		expected string
	}{
		{"一只猫", ThemeNone, "一只猫"},
		{"一只猫", ThemeCartoon, "一只猫，采用卡通风格，色彩鲜艳丰富，造型可爱有趣，使用简单几何形状和明亮饱和的色彩"},
		{"一座房子", ThemeMinimal, "一座房子，采用极简风格，元素精简，线条干净，使用几何形状，色调简洁统一"},
		{"", ThemeCartoon, "，采用卡通风格，色彩鲜艳丰富，造型可爱有趣，使用简单几何形状和明亮饱和的色彩"},
	}

	for _, test := range tests {
		result := ApplyThemeToPrompt(test.prompt, test.theme)
		if result != test.expected {
			t.Errorf("ApplyThemeToPrompt(%q, %q) = %q, expected %q", test.prompt, test.theme, result, test.expected)
		}
	}
}

func TestGetAvailableThemes(t *testing.T) {
	themes := GetAvailableThemes()
	expectedCount := 9 // ThemeNone + 8 themed options

	if len(themes) != expectedCount {
		t.Errorf("GetAvailableThemes() returned %d themes, expected %d", len(themes), expectedCount)
	}

	// Check that all themes are valid
	for _, theme := range themes {
		if !IsValidTheme(theme) {
			t.Errorf("GetAvailableThemes() returned invalid theme: %q", theme)
		}
	}
}

func TestGenerateSVGParamsValidateWithTheme(t *testing.T) {
	tests := []struct {
		params   GenerateSVGParams
		valid    bool
		errorMsg string
	}{
		{
			params: GenerateSVGParams{
				Prompt: "test prompt",
				Theme:  ThemeCartoon,
			},
			valid: true,
		},
		{
			params: GenerateSVGParams{
				Prompt: "test prompt",
				Theme:  ThemeNone,
			},
			valid: true,
		},
		{
			params: GenerateSVGParams{
				Prompt: "test prompt",
				Theme:  "invalid_theme",
			},
			valid:    false,
			errorMsg: "invalid theme type",
		},
		{
			params: GenerateSVGParams{
				Prompt: "ab", // too short
				Theme:  ThemeCartoon,
			},
			valid:    false,
			errorMsg: "prompt must be at least 3 characters",
		},
	}

	for i, test := range tests {
		valid, msg := test.params.Validate()
		if valid != test.valid {
			t.Errorf("Test %d: Validate() = %v, expected %v", i, valid, test.valid)
		}
		if !test.valid && msg != test.errorMsg {
			t.Errorf("Test %d: Validate() error message = %q, expected %q", i, msg, test.errorMsg)
		}
	}
}

func TestGetThemeInfo(t *testing.T) {
	info := GetThemeInfo(ThemeCartoon)

	expected := ThemeInfo{
		ID:                  ThemeCartoon,
		Name:                "卡通风格",
		Description:         "色彩鲜艳的卡通风格，适合可爱有趣的内容",
		Prompt:              "采用卡通风格，色彩鲜艳丰富，造型可爱有趣，使用简单几何形状和明亮饱和的色彩",
		RecommendedProvider: "recraft",
	}

	if info.ID != expected.ID {
		t.Errorf("GetThemeInfo ID = %v, expected %v", info.ID, expected.ID)
	}
	if info.Name != expected.Name {
		t.Errorf("GetThemeInfo Name = %v, expected %v", info.Name, expected.Name)
	}
	if info.Description != expected.Description {
		t.Errorf("GetThemeInfo Description = %v, expected %v", info.Description, expected.Description)
	}
	if info.Prompt != expected.Prompt {
		t.Errorf("GetThemeInfo Prompt = %v, expected %v", info.Prompt, expected.Prompt)
	}
	if info.RecommendedProvider != expected.RecommendedProvider {
		t.Errorf("GetThemeInfo RecommendedProvider = %v, expected %v", info.RecommendedProvider, expected.RecommendedProvider)
	}
}

func TestGetAllThemesInfo(t *testing.T) {
	themes := GetAllThemesInfo()
	expectedCount := 9

	if len(themes) != expectedCount {
		t.Errorf("GetAllThemesInfo returned %d themes, expected %d", len(themes), expectedCount)
	}

	// Check that all themes have required fields
	for _, theme := range themes {
		if theme.ID == "" && theme.Name != "无主题" {
			t.Errorf("Theme ID is empty for theme: %s", theme.Name)
		}
		if theme.Name == "" {
			t.Errorf("Theme Name is empty for ID: %s", theme.ID)
		}
		if theme.ID != ThemeNone && theme.Prompt == "" {
			t.Errorf("Theme Prompt is empty for ID: %s", theme.ID)
		}
		// Description can be empty for some themes, so we don't check it
	}

	// Check that ThemeNone is included
	found := false
	for _, theme := range themes {
		if theme.ID == ThemeNone {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("ThemeNone not found in GetAllThemesInfo result")
	}
}


func TestGenerateSVGParamsAutoSelectProvider(t *testing.T) {
	tests := []struct {
		name             string
		params           GenerateSVGParams
		expectedProvider svggen.Provider
		valid            bool
	}{
		{
			name: "No theme, no provider - should use default",
			params: GenerateSVGParams{
				Prompt: "test prompt",
			},
			expectedProvider: svggen.ProviderSVGIO,
			valid:            true,
		},
		{
			name: "Cartoon theme, no provider - should use recraft",
			params: GenerateSVGParams{
				Prompt: "test prompt",
				Theme:  ThemeCartoon,
			},
			expectedProvider: svggen.ProviderRecraft,
			valid:            true,
		},
		{
			name: "Minimal theme, no provider - should use svgio",
			params: GenerateSVGParams{
				Prompt: "test prompt",
				Theme:  ThemeMinimal,
			},
			expectedProvider: svggen.ProviderSVGIO,
			valid:            true,
		},
		{
			name: "Cartoon theme with explicit provider - should keep explicit",
			params: GenerateSVGParams{
				Prompt:   "test prompt",
				Theme:    ThemeCartoon,
				Provider: svggen.ProviderOpenAI,
			},
			expectedProvider: svggen.ProviderOpenAI,
			valid:            true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			valid, _ := test.params.Validate()
			if valid != test.valid {
				t.Errorf("Validate() = %v, expected %v", valid, test.valid)
			}
			if test.params.Provider != test.expectedProvider {
				t.Errorf("Provider = %v, expected %v", test.params.Provider, test.expectedProvider)
			}
		})
	}
}
