package controller

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/goplus/builder/spx-backend/internal/copilot"
	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/model"
)

// ProjectContextParams represents parameters for project context generation
type ProjectContextParams struct {
	ProjectID          int64  `json:"project_id"`
	ProjectName        string `json:"project_name"`
	ProjectDescription string `json:"project_description,omitempty"`
}

// Validate validates the project context parameters
func (p *ProjectContextParams) Validate() (bool, string) {
	if p.ProjectID <= 0 {
		return false, "project_id is required and must be positive"
	}
	if len(p.ProjectName) < 1 {
		return false, "project_name is required"
	}
	if len(p.ProjectName) > 255 {
		return false, "project_name must be less than 255 characters"
	}
	return true, ""
}

// InstantRecommendParams represents parameters for instant recommendation
type InstantRecommendParams struct {
	ProjectID  int64     `json:"project_id"`
	UserPrompt string    `json:"user_prompt"`
	TopK       int       `json:"top_k,omitempty"`
	Theme      ThemeType `json:"theme,omitempty"`
}

// Validate validates the instant recommendation parameters
func (p *InstantRecommendParams) Validate() (bool, string) {
	if p.ProjectID <= 0 {
		return false, "project_id is required and must be positive"
	}
	if len(p.UserPrompt) < 1 {
		return false, "user_prompt is required"
	}
	if p.TopK == 0 {
		p.TopK = 4 // Default to top 4 results
	}
	if p.TopK < 1 || p.TopK > 50 {
		return false, "top_k must be between 1 and 50"
	}
	if !IsValidTheme(p.Theme) {
		return false, "invalid theme type"
	}
	return true, ""
}

// GenerateProjectContext generates project context keywords using LLM
func (ctrl *Controller) GenerateProjectContext(ctx context.Context, params *ProjectContextParams) (*model.ProjectContext, error) {
	logger := log.GetReqLogger(ctx)
	logger.Printf("GenerateProjectContext request - project_id: %d, name: %q",
		params.ProjectID, params.ProjectName)

	// Generate related words using LLM
	relatedWords, err := ctrl.generateRelatedWordsWithLLM(ctx, params.ProjectName, params.ProjectDescription)
	if err != nil {
		return nil, fmt.Errorf("failed to generate related words: %w", err)
	}

	// Create project context
	projectContext := &model.ProjectContext{
		ProjectID:    params.ProjectID,
		Name:         params.ProjectName,
		Description:  params.ProjectDescription,
		RelatedWords: model.WordsList(relatedWords),
		CreatedAt:    time.Now(),
	}

	// Save to database
	if err := ctrl.db.Save(projectContext).Error; err != nil {
		return nil, fmt.Errorf("failed to save project context: %w", err)
	}

	logger.Printf("Generated %d related words for project %d", len(relatedWords), params.ProjectID)
	return projectContext, nil
}

// generateRelatedWordsWithLLM uses LLM to generate related words for the project
func (ctrl *Controller) generateRelatedWordsWithLLM(ctx context.Context, projectName, projectDescription string) ([]string, error) {
	logger := log.GetReqLogger(ctx)
	

	// Build the prompt for word generation
	systemPrompt := `你是一个专业的游戏项目分析师，请为项目生成15-20个相关的关键词，这些关键词将用于图片推荐。

要求：
1. 关键词应该涵盖项目主题相关的物体、场景、风格、情绪等
2. 包含中文和英文关键词都可以
3. 每个关键词简短精确，避免长句子
4. 按重要性排序，重要的在前面

请只返回关键词列表，每行一个，不要包含其他解释文字。

示例格式：
宇宙飞船
外星人
星球
太空站
科幻
冒险`

	userPrompt := fmt.Sprintf("项目名称：%s\n项目描述：%s", projectName, projectDescription)

	// Call LLM using copilot
	params := &copilot.Params{
		System: copilot.Content{
			Type: copilot.ContentTypeText,
			Text: systemPrompt,
		},
		Messages: []copilot.Message{
			{
				Role: copilot.RoleUser,
				Content: copilot.Content{
					Type: copilot.ContentTypeText,
					Text: userPrompt,
				},
			},
		},
	}

	result, err := ctrl.copilot.Message(ctx, params, false)
	if err != nil {
		return nil, fmt.Errorf("LLM call failed: %w", err)
	}

	// Parse the response to extract words
	response := strings.TrimSpace(result.Message.Content.Text)
	words := ctrl.extractWordsFromResponse(response)

	// Clean and validate words
	words = ctrl.cleanWords(words)

	if len(words) == 0 {
		// Fallback: create basic words from project name
		words = []string{projectName}
	}

	logger.Printf("Successfully generated %d words", len(words))
	return words, nil
}

// extractWordsFromResponse extracts words from LLM response
func (ctrl *Controller) extractWordsFromResponse(response string) []string {
	// Split by newlines and clean
	lines := strings.Split(response, "\n")
	var words []string

	for _, line := range lines {
		line = strings.TrimSpace(line)
		// Remove common prefixes and clean
		line = strings.TrimPrefix(line, "-")
		line = strings.TrimPrefix(line, "*")
		line = strings.TrimPrefix(line, "•")
		line = regexp.MustCompile(`^\d+\.?\s*`).ReplaceAllString(line, "")
		line = strings.TrimSpace(line)

		if len(line) > 0 && len(line) < 50 {
			words = append(words, line)
		}
	}

	return words
}

// cleanWords removes duplicates and validates words
func (ctrl *Controller) cleanWords(words []string) []string {
	seen := make(map[string]bool)
	var cleaned []string

	for _, word := range words {
		word = strings.TrimSpace(word)
		if len(word) < 1 || len(word) > 50 {
			continue
		}

		// Remove duplicates (case-insensitive)
		wordLower := strings.ToLower(word)
		if seen[wordLower] {
			continue
		}
		seen[wordLower] = true

		cleaned = append(cleaned, word)
	}

	// Limit to 20 words max
	if len(cleaned) > 20 {
		cleaned = cleaned[:20]
	}

	return cleaned
}

// RecommendImagesWithContext performs instant recommendation with project context
func (ctrl *Controller) RecommendImagesWithContext(ctx context.Context, params *InstantRecommendParams) (*ImageRecommendResult, error) {
	logger := log.GetReqLogger(ctx)
	
	logger.Printf("InstantRecommend request - project_id: %d, prompt: %q, top_k: %d",
		params.ProjectID, params.UserPrompt, params.TopK)

	// Get project context
	var projectContext model.ProjectContext
	err := ctrl.db.Where("project_id = ?", params.ProjectID).First(&projectContext).Error

	if err != nil {
		logger.Printf("Project context not found for project %d, using original prompt", params.ProjectID)
		// Fallback to original recommendation without context (SearchOnly mode)
		imageParams := &ImageRecommendParams{
			Text:       params.UserPrompt,
			TopK:       params.TopK,
			Theme:      params.Theme,
			SearchOnly: true, // Instant recommend should only search, not generate
		}
		return ctrl.RecommendImages(ctx, imageParams)
	}

	// Enhance user prompt with project context
	enhancedPrompt := ctrl.enhancePromptWithContext(params.UserPrompt, projectContext.RelatedWords.ToSlice())
	logger.Printf("Enhanced prompt: %q", enhancedPrompt)

	// Call original recommendation with enhanced prompt (SearchOnly mode)
	imageParams := &ImageRecommendParams{
		Text:       enhancedPrompt,
		TopK:       params.TopK,
		Theme:      params.Theme,
		SearchOnly: true, // Instant recommend should only search, not generate
	}

	result, err := ctrl.RecommendImages(ctx, imageParams)
	if err != nil {
		return nil, err
	}

	// Update the query in result to show enhancement
	result.Query = fmt.Sprintf("%s (enhanced with project context)", params.UserPrompt)

	return result, nil
}

// enhancePromptWithContext combines user prompt with relevant project words
func (ctrl *Controller) enhancePromptWithContext(userPrompt string, relatedWords []string) string {
	if len(relatedWords) == 0 {
		return userPrompt
	}

	// Select up to 5 most relevant words
	selectedWords := relatedWords
	if len(selectedWords) > 5 {
		selectedWords = selectedWords[:5]
	}

	// Build enhanced prompt
	contextStr := strings.Join(selectedWords, ", ")
	return fmt.Sprintf("%s, 相关元素: %s", userPrompt, contextStr)
}
