package asscompletion

import (
	_ "embed"
	"fmt"
	"strings"
)

//go:embed system_prompt.md
var systemPromptTpl string

// SystemPrompt is the fully rendered system prompt used to instruct the asset completion assistant.
// It is initialized during package initialization.
var SystemPrompt string


func init() {
	// The system prompt for asset completion is static and doesn't need template processing
	SystemPrompt = systemPromptTpl
}

// BuildSystemPrompt creates a dynamic system prompt for AI completion with existing assets context
func BuildSystemPrompt(existingAssets []string, maxSampleSize int) string {
	var builder strings.Builder

	// Add the base system prompt
	builder.WriteString(SystemPrompt)
	builder.WriteString("\n\n")

	// Add existing assets context if available
	if len(existingAssets) > 0 {
		builder.WriteString("## Existing Asset Reference / 现有素材参考\n\n")
		builder.WriteString("Here are some existing asset names in the project. Please avoid duplication and reference their naming style:\n")
		builder.WriteString("以下是项目中已存在的部分素材名称，请避免重复并参考其命名风格：\n\n")

		// Show a sample of existing assets (limit to avoid token overflow)
		sampleSize := maxSampleSize
		if len(existingAssets) < sampleSize {
			sampleSize = len(existingAssets)
		}

		for i := 0; i < sampleSize; i++ {
			builder.WriteString("- ")
			builder.WriteString(existingAssets[i])
			builder.WriteString("\n")
		}

		if len(existingAssets) > sampleSize {
			builder.WriteString(fmt.Sprintf("... and %d more assets / 以及其他 %d 个素材\n", len(existingAssets)-sampleSize, len(existingAssets)-sampleSize))
		}
		builder.WriteString("\n")
	}

	builder.WriteString("Please provide suggestions based on the above guidelines, ensuring all suggestions comply with naming standards and have practical value.\n")
	builder.WriteString("请根据上述指导原则提供建议，确保所有建议都符合命名规范且具有实用价值。")

	return builder.String()
}

// BuildUserPrompt creates a unified bilingual user prompt for AI completion
func BuildUserPrompt(prefix string, limit int) string {
	return fmt.Sprintf("Generate %d creative asset name suggestions related to '%s'. / 请根据关键词'%s'生成%d个游戏素材名称建议。\n\n"+
		"Requirements / 要求：\n"+
		"1. Names should start with or contain '%s' / 名称应包含或以'%s'开头\n"+
		"2. Suitable for game development / 适合游戏开发的素材名称\n"+
		"3. Cover different categories: sprites, sounds, UI, backgrounds, props, etc. / 涵盖不同类型：精灵动画、音效、UI界面、背景图、道具等\n"+
		"4. Be descriptive of function, e.g.: %s_jump, %s_attack_sound, %s_icon / 名称要具体描述功能，如：%s_跳跃动画、%s_攻击音效、%s_头像图标\n"+
		"5. Use underscores to connect words / 使用下划线连接词语\n\n"+
		"Please list suggestions directly, one per line, without numbers or bullets. / 请直接列出建议，每行一个，不要编号。",
		limit, prefix, prefix, limit, prefix, prefix, prefix, prefix, prefix, prefix, prefix, prefix)
}

// ContainsChinese checks if a string contains Chinese characters
func ContainsChinese(s string) bool {
	for _, r := range s {
		if r >= 0x4e00 && r <= 0x9fff { // CJK Unified Ideographs range
			return true
		}
	}
	return false
}

// containsChinese is a private alias for backward compatibility
func containsChinese(s string) bool {
	return ContainsChinese(s)
}