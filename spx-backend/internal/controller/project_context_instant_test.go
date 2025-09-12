package controller

import (
	"strings"
	"testing"

	"github.com/goplus/builder/spx-backend/internal/model"
)

// TestInstantRecommendLogic 测试即时推荐的核心逻辑（不依赖外部服务）
func TestInstantRecommendLogic(t *testing.T) {
	ctrl := &Controller{}

	tests := []struct {
		name             string
		userPrompt       string
		relatedWords     []string
		expectedEnhanced bool
		expectedContains []string
	}{
		{
			name:             "no context - should return original",
			userPrompt:       "cute robot",
			relatedWords:     []string{},
			expectedEnhanced: false,
			expectedContains: []string{"cute robot"},
		},
		{
			name:             "with context - should enhance",
			userPrompt:       "cute astronaut",
			relatedWords:     []string{"spaceship", "alien", "planet", "star", "galaxy"},
			expectedEnhanced: true,
			expectedContains: []string{"cute astronaut", "相关元素:", "spaceship", "alien"},
		},
		{
			name:             "long context - should limit to 5 words",
			userPrompt:       "game character",
			relatedWords:     []string{"word1", "word2", "word3", "word4", "word5", "word6", "word7", "word8"},
			expectedEnhanced: true,
			expectedContains: []string{"game character", "相关元素:", "word1", "word2", "word3", "word4", "word5"},
		},
		{
			name:             "single context word",
			userPrompt:       "vehicle",
			relatedWords:     []string{"spaceship"},
			expectedEnhanced: true,
			expectedContains: []string{"vehicle", "相关元素:", "spaceship"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ctrl.enhancePromptWithContext(tt.userPrompt, tt.relatedWords)

			// 检查是否按预期增强
			if tt.expectedEnhanced {
				if result == tt.userPrompt {
					t.Error("Expected prompt to be enhanced, but it remained the same")
				}
				if !containsAll(result, tt.expectedContains) {
					t.Errorf("Enhanced prompt missing expected content. Got: %q", result)
				}
			} else {
				if result != tt.userPrompt {
					t.Errorf("Expected original prompt %q, got %q", tt.userPrompt, result)
				}
			}

			t.Logf("Input: %q → Output: %q", tt.userPrompt, result)
		})
	}
}

// containsAll 检查字符串是否包含所有指定的子字符串
func containsAll(text string, substrings []string) bool {
	for _, substr := range substrings {
		if !strings.Contains(text, substr) {
			return false
		}
	}
	return true
}

// TestInstantRecommendParams_EdgeCases 测试参数验证的边界情况
func TestInstantRecommendParams_EdgeCases(t *testing.T) {
	tests := []struct {
		name    string
		params  InstantRecommendParams
		wantOk  bool
		wantMsg string
	}{
		{
			name: "zero top_k should default to 4",
			params: InstantRecommendParams{
				ProjectID:  1,
				UserPrompt: "test",
				TopK:       0, // 应该被设置为默认值4
			},
			wantOk: true,
		},
		{
			name: "boundary top_k = 1",
			params: InstantRecommendParams{
				ProjectID:  1,
				UserPrompt: "test",
				TopK:       1,
			},
			wantOk: true,
		},
		{
			name: "boundary top_k = 50",
			params: InstantRecommendParams{
				ProjectID:  1,
				UserPrompt: "test",
				TopK:       50,
			},
			wantOk: true,
		},
		{
			name: "empty theme should be valid (ThemeNone)",
			params: InstantRecommendParams{
				ProjectID:  1,
				UserPrompt: "test",
				Theme:      ThemeNone,
			},
			wantOk: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			originalTopK := tt.params.TopK
			got, msg := tt.params.Validate()

			if got != tt.wantOk {
				t.Errorf("InstantRecommendParams.Validate() got = %v, want %v, msg = %s", got, tt.wantOk, msg)
			}

			// 检查TopK默认值设置
			if originalTopK == 0 && tt.wantOk && tt.params.TopK != 4 {
				t.Errorf("Expected TopK to be set to default 4, got %d", tt.params.TopK)
			}
		})
	}
}

// TestProjectContextCreation 测试项目上下文的创建逻辑（不涉及数据库）
func TestProjectContextCreation(t *testing.T) {
	testWords := []string{"spaceship", "alien", "planet", "astronaut", "galaxy"}

	// 创建项目上下文对象
	ctx := &model.ProjectContext{
		ProjectID:    123,
		Name:         "Test Space Game",
		Description:  "A game about space exploration",
		RelatedWords: model.WordsList(testWords),
	}

	// 验证数据结构
	if ctx.ProjectID != 123 {
		t.Errorf("Expected ProjectID 123, got %d", ctx.ProjectID)
	}

	if ctx.Name != "Test Space Game" {
		t.Errorf("Expected name 'Test Space Game', got %s", ctx.Name)
	}

	if len(ctx.RelatedWords) != 5 {
		t.Errorf("Expected 5 related words, got %d", len(ctx.RelatedWords))
	}

	// 测试WordsList方法
	if ctx.RelatedWords.Count() != 5 {
		t.Errorf("Expected Count() = 5, got %d", ctx.RelatedWords.Count())
	}

	if ctx.RelatedWords.IsEmpty() {
		t.Error("Expected RelatedWords not to be empty")
	}

	slice := ctx.RelatedWords.ToSlice()
	if len(slice) != 5 {
		t.Errorf("Expected ToSlice() length 5, got %d", len(slice))
	}

	if slice[0] != "spaceship" {
		t.Errorf("Expected first word 'spaceship', got %s", slice[0])
	}

	t.Log("Project context creation test passed")
}

// TestPromptEnhancementScenarios 测试各种实际使用场景
func TestPromptEnhancementScenarios(t *testing.T) {
	ctrl := &Controller{}

	scenarios := []struct {
		name         string
		projectType  string
		userPrompt   string
		relatedWords []string
		expectWords  int // 期望的上下文词数
	}{
		{
			name:         "太空游戏场景",
			projectType:  "太空探险",
			userPrompt:   "可爱的宇航员",
			relatedWords: []string{"宇宙飞船", "外星人", "星球", "陨石", "太空站", "银河", "火箭"},
			expectWords:  5, // 限制到5个词
		},
		{
			name:         "教育游戏场景",
			projectType:  "儿童数学",
			userPrompt:   "数字卡通形象",
			relatedWords: []string{"数字", "计算器", "书本", "铅笔", "卡通", "彩色", "学习"},
			expectWords:  5,
		},
		{
			name:         "少量关联词场景",
			projectType:  "简单游戏",
			userPrompt:   "游戏角色",
			relatedWords: []string{"角色", "冒险"},
			expectWords:  2, // 只有2个词
		},
	}

	for _, scenario := range scenarios {
		t.Run(scenario.name, func(t *testing.T) {
			result := ctrl.enhancePromptWithContext(scenario.userPrompt, scenario.relatedWords)

			// 验证增强结果
			if !strings.Contains(result, scenario.userPrompt) {
				t.Error("Enhanced prompt should contain original prompt")
			}

			if !strings.Contains(result, "相关元素:") {
				t.Error("Enhanced prompt should contain context marker")
			}

			// 计算实际添加的上下文词数
			parts := strings.Split(result, "相关元素: ")
			if len(parts) != 2 {
				t.Error("Enhanced prompt format incorrect")
				return
			}

			contextWords := strings.Split(parts[1], ", ")
			actualWords := len(contextWords)

			if actualWords != scenario.expectWords {
				t.Errorf("Expected %d context words, got %d", scenario.expectWords, actualWords)
			}

			t.Logf("%s: %q → %q (%d words)", scenario.projectType, scenario.userPrompt, result, actualWords)
		})
	}
}

// BenchmarkPromptEnhancement 性能基准测试
func BenchmarkPromptEnhancement(b *testing.B) {
	ctrl := &Controller{}
	userPrompt := "cute character design"
	relatedWords := []string{
		"cartoon", "anime", "character", "design", "cute", "colorful",
		"friendly", "mascot", "illustration", "digital", "art", "style",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ctrl.enhancePromptWithContext(userPrompt, relatedWords)
	}
}
