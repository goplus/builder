package keywordservice

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/builder/spx-backend/internal/types"
	"gorm.io/gorm"
)

// KeywordGeneratorService handles keyword generation for projects
type KeywordGeneratorService struct {
	db     *gorm.DB
	client *http.Client
}

// NewKeywordGeneratorService creates a new keyword generator service
func NewKeywordGeneratorService(db *gorm.DB) *KeywordGeneratorService {
	return &KeywordGeneratorService{
		db: db,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// KeywordGenerationParams represents parameters for keyword generation
type KeywordGenerationParams struct {
	ProjectName string          `json:"project_name"`
	Description string          `json:"description,omitempty"`
	Theme       types.ThemeType `json:"theme,omitempty"`
	MaxKeywords int             `json:"max_keywords,omitempty"`
}

// Validate validates the keyword generation parameters
func (p *KeywordGenerationParams) Validate() (bool, string) {
	if strings.TrimSpace(p.ProjectName) == "" {
		return false, "project_name is required"
	}
	if p.MaxKeywords == 0 {
		p.MaxKeywords = 12 // Default to 12 keywords
	}
	if p.MaxKeywords < 5 || p.MaxKeywords > 30 {
		return false, "max_keywords must be between 5 and 30"
	}
	return true, ""
}

// GeneratedKeywordsResult represents the result of keyword generation
type GeneratedKeywordsResult struct {
	ProjectID int64           `json:"project_id"`
	Keywords  []string        `json:"keywords"`
	Theme     types.ThemeType `json:"theme"`
	Prompt    string          `json:"prompt"`
}

// ProjectKeywordsDTO represents project keywords data transfer object
type ProjectKeywordsDTO struct {
	ProjectID        int64     `json:"project_id"`
	Keywords         []string  `json:"keywords"`
	Theme            string    `json:"theme"`
	Status           string    `json:"status"`
	GeneratedAt      time.Time `json:"generated_at"`
	GenerationPrompt string    `json:"generation_prompt"`
}

// LLMRequest represents a request to LLM service
type LLMRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	MaxTokens   int       `json:"max_tokens,omitempty"`
	Temperature float64   `json:"temperature,omitempty"`
}

// Message represents a chat message
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// LLMResponse represents response from LLM service
type LLMResponse struct {
	Choices []Choice `json:"choices"`
}

// Choice represents a choice in LLM response
type Choice struct {
	Message Message `json:"message"`
}

// KeywordResponse represents parsed keywords from LLM
type KeywordResponse struct {
	Keywords []string `json:"keywords"`
}

// GenerateKeywords generates keywords for a project using LLM
func (s *KeywordGeneratorService) GenerateKeywords(ctx context.Context, projectID int64, params *KeywordGenerationParams) (*GeneratedKeywordsResult, error) {
	logger := log.GetReqLogger(ctx)

	// Validate parameters
	if valid, errMsg := params.Validate(); !valid {
		return nil, fmt.Errorf("invalid parameters: %s", errMsg)
	}

	logger.Printf("Generating keywords for project %d - name: %q, theme: %s", projectID, params.ProjectName, params.Theme)

	// Create or update project keywords record with pending status
	pkRecord := &model.ProjectKeywords{
		ProjectID:        projectID,
		Keywords:         make(model.StringSlice, 0),
		GeneratedAt:      time.Now(),
		Theme:            string(params.Theme),
		Status:           model.KeywordStatusGenerating,
		GenerationPrompt: s.buildGenerationPrompt(params),
	}

	// Save pending record
	if err := s.saveOrUpdateKeywords(ctx, pkRecord); err != nil {
		logger.Printf("Failed to save pending keywords record: %v", err)
		return nil, fmt.Errorf("failed to save keywords record: %w", err)
	}

	// Generate keywords using LLM
	keywords, err := s.callLLMForKeywords(ctx, params)
	if err != nil {
		// Update status to failed
		pkRecord.Status = model.KeywordStatusFailed
		s.saveOrUpdateKeywords(ctx, pkRecord)
		logger.Printf("LLM keyword generation failed: %v", err)
		return nil, fmt.Errorf("keyword generation failed: %w", err)
	}

	// Update record with generated keywords
	pkRecord.Keywords = model.StringSlice(keywords)
	pkRecord.Status = model.KeywordStatusCompleted
	pkRecord.GeneratedAt = time.Now()

	if err := s.saveOrUpdateKeywords(ctx, pkRecord); err != nil {
		logger.Printf("Failed to save generated keywords: %v", err)
		return nil, fmt.Errorf("failed to save generated keywords: %w", err)
	}

	logger.Printf("Successfully generated %d keywords for project %d", len(keywords), projectID)

	return &GeneratedKeywordsResult{
		ProjectID: projectID,
		Keywords:  keywords,
		Theme:     params.Theme,
		Prompt:    pkRecord.GenerationPrompt,
	}, nil
}

// GetProjectKeywords retrieves existing keywords for a project
func (s *KeywordGeneratorService) GetProjectKeywords(ctx context.Context, projectID int64) (*model.ProjectKeywords, error) {
	var pkRecord model.ProjectKeywords

	err := s.db.Where("project_id = ?", projectID).
		Order("created_at DESC").
		First(&pkRecord).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil // No keywords found, not an error
		}
		return nil, fmt.Errorf("failed to retrieve project keywords: %w", err)
	}

	return &pkRecord, nil
}

// UpdateProjectKeywords updates existing keywords for a project
func (s *KeywordGeneratorService) UpdateProjectKeywords(ctx context.Context, projectID int64, keywords []string, theme types.ThemeType) error {
	logger := log.GetReqLogger(ctx)

	pkRecord := &model.ProjectKeywords{
		ProjectID:   projectID,
		Keywords:    model.StringSlice(keywords),
		GeneratedAt: time.Now(),
		Theme:       string(theme),
		Status:      model.KeywordStatusCompleted,
	}

	if err := s.saveOrUpdateKeywords(ctx, pkRecord); err != nil {
		logger.Printf("Failed to update keywords for project %d: %v", projectID, err)
		return fmt.Errorf("failed to update keywords: %w", err)
	}

	logger.Printf("Successfully updated keywords for project %d", projectID)
	return nil
}

// DeleteProjectKeywords deletes keywords for a project
func (s *KeywordGeneratorService) DeleteProjectKeywords(ctx context.Context, projectID int64) error {
	result := s.db.Where("project_id = ?", projectID).Delete(&model.ProjectKeywords{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete project keywords: %w", result.Error)
	}
	return nil
}

// buildGenerationPrompt builds the prompt for LLM keyword generation
func (s *KeywordGeneratorService) buildGenerationPrompt(params *KeywordGenerationParams) string {
	var promptBuilder strings.Builder

	promptBuilder.WriteString("根据以下项目信息生成相关的关键词：\n\n")
	promptBuilder.WriteString(fmt.Sprintf("项目名称：%s\n", params.ProjectName))

	if params.Description != "" {
		promptBuilder.WriteString(fmt.Sprintf("项目描述：%s\n", params.Description))
	}

	if params.Theme != types.ThemeNone {
		themeDesc := types.ThemeDescriptions[params.Theme]
		promptBuilder.WriteString(fmt.Sprintf("主题风格：%s\n", themeDesc))
	}

	promptBuilder.WriteString(fmt.Sprintf("\n请生成%d个与该项目相关的关键词，这些关键词将用于图片搜索。", params.MaxKeywords))
	promptBuilder.WriteString("关键词应该包括：\n")
	promptBuilder.WriteString("1. 项目主题相关的具体物品和角色\n")
	promptBuilder.WriteString("2. 相关的背景和环境元素\n")
	promptBuilder.WriteString("3. 适合的道具和装饰物品\n")

	if params.Theme != types.ThemeNone {
		promptBuilder.WriteString("4. 符合主题风格的特色元素\n")
	}

	promptBuilder.WriteString("\n请以JSON格式返回，格式如下：\n")
	promptBuilder.WriteString(`{"keywords": ["关键词1", "关键词2", ...]}`)

	return promptBuilder.String()
}

// callLLMForKeywords calls LLM service to generate keywords
func (s *KeywordGeneratorService) callLLMForKeywords(ctx context.Context, params *KeywordGenerationParams) ([]string, error) {
	// For now, return mock keywords until LLM integration is configured
	// TODO: Implement actual LLM service call when API endpoint is available
	return s.generateMockKeywords(params), nil
}

// generateMockKeywords generates mock keywords for testing
func (s *KeywordGeneratorService) generateMockKeywords(params *KeywordGenerationParams) []string {
	projectName := strings.ToLower(params.ProjectName)

	// Base keywords generation logic based on project name
	var keywords []string

	if strings.Contains(projectName, "太空") || strings.Contains(projectName, "宇宙") {
		keywords = []string{"宇宙飞船", "外星人", "星球", "陨石", "太空站", "宇航员", "星空", "火箭", "激光", "机器人", "太空服", "银河系"}
	} else if strings.Contains(projectName, "海洋") || strings.Contains(projectName, "海底") {
		keywords = []string{"潜水艇", "鱼类", "珊瑚", "海藻", "海豚", "鲸鱼", "章鱼", "贝壳", "海底城堡", "潜水员", "海星", "水母"}
	} else if strings.Contains(projectName, "森林") || strings.Contains(projectName, "丛林") {
		keywords = []string{"大树", "小鸟", "兔子", "蝴蝶", "蘑菇", "花朵", "叶子", "小溪", "木屋", "松鼠", "鹿", "萤火虫"}
	} else if strings.Contains(projectName, "城市") || strings.Contains(projectName, "都市") {
		keywords = []string{"建筑物", "汽车", "红绿灯", "公园", "商店", "咖啡厅", "公交车", "行人", "路灯", "天桥", "广场", "摩天大楼"}
	} else {
		// Generic keywords
		keywords = []string{"角色", "背景", "道具", "装饰", "图标", "符号", "元素", "物品", "场景", "界面", "按钮", "效果"}
	}

	// Apply theme-specific modifications
	if params.Theme != types.ThemeNone {
		keywords = s.applyThemeToKeywords(keywords, params.Theme)
	}

	// Limit to requested number
	if len(keywords) > params.MaxKeywords {
		keywords = keywords[:params.MaxKeywords]
	}

	return keywords
}

// applyThemeToKeywords applies theme-specific modifications to keywords
func (s *KeywordGeneratorService) applyThemeToKeywords(keywords []string, theme types.ThemeType) []string {
	var themeKeywords []string

	switch theme {
	case types.ThemeCartoon:
		themeKeywords = append(keywords, "卡通", "可爱", "彩色", "圆形")
	case types.ThemeRealistic:
		themeKeywords = append(keywords, "写实", "细节", "质感", "光影")
	case types.ThemeMinimal:
		themeKeywords = append(keywords, "简约", "几何", "线条", "单色")
	case types.ThemeFantasy:
		themeKeywords = append(keywords, "魔法", "奇幻", "神秘", "梦幻")
	case types.ThemeScifi:
		themeKeywords = append(keywords, "科技", "未来", "机械", "霓虹")
	case types.ThemeNature:
		themeKeywords = append(keywords, "自然", "有机", "植物", "大地")
	default:
		themeKeywords = keywords
	}

	return themeKeywords
}

// saveOrUpdateKeywords saves or updates project keywords
func (s *KeywordGeneratorService) saveOrUpdateKeywords(ctx context.Context, pkRecord *model.ProjectKeywords) error {
	// Try to find existing record
	var existing model.ProjectKeywords
	result := s.db.Where("project_id = ?", pkRecord.ProjectID).First(&existing)

	if result.Error == gorm.ErrRecordNotFound {
		// Create new record
		return s.db.Create(pkRecord).Error
	} else if result.Error != nil {
		return result.Error
	} else {
		// Update existing record
		return s.db.Model(&existing).Updates(pkRecord).Error
	}
}
