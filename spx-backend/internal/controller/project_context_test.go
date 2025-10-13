package controller

import (
	"fmt"
	"testing"

	"github.com/goplus/builder/spx-backend/internal/model"
)

func TestProjectContextParams_Validate(t *testing.T) {
	tests := []struct {
		name    string
		params  ProjectContextParams
		wantOk  bool
		wantMsg string
	}{
		{
			name: "valid params",
			params: ProjectContextParams{
				ProjectID:   1,
				ProjectName: "Test Project",
			},
			wantOk: true,
		},
		{
			name: "missing project_id",
			params: ProjectContextParams{
				ProjectID:   0,
				ProjectName: "Test Project",
			},
			wantOk:  false,
			wantMsg: "project_id is required and must be positive",
		},
		{
			name: "missing project_name",
			params: ProjectContextParams{
				ProjectID:   1,
				ProjectName: "",
			},
			wantOk:  false,
			wantMsg: "project_name is required",
		},
		{
			name: "project_name too long",
			params: ProjectContextParams{
				ProjectID:   1,
				ProjectName: string(make([]byte, 256)), // 256 characters
			},
			wantOk:  false,
			wantMsg: "project_name must be less than 255 characters",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, msg := tt.params.Validate()
			if got != tt.wantOk {
				t.Errorf("ProjectContextParams.Validate() got = %v, want %v", got, tt.wantOk)
			}
			if !tt.wantOk && msg != tt.wantMsg {
				t.Errorf("ProjectContextParams.Validate() msg = %v, want %v", msg, tt.wantMsg)
			}
		})
	}
}

func TestInstantRecommendParams_Validate(t *testing.T) {
	tests := []struct {
		name    string
		params  InstantRecommendParams
		wantOk  bool
		wantMsg string
	}{
		{
			name: "valid params",
			params: InstantRecommendParams{
				ProjectID:  1,
				UserPrompt: "test prompt",
				TopK:       4,
				Theme:      ThemeCartoon,
			},
			wantOk: true,
		},
		{
			name: "missing project_id",
			params: InstantRecommendParams{
				ProjectID:  0,
				UserPrompt: "test prompt",
			},
			wantOk:  false,
			wantMsg: "project_id is required and must be positive",
		},
		{
			name: "missing user_prompt",
			params: InstantRecommendParams{
				ProjectID:  1,
				UserPrompt: "",
			},
			wantOk:  false,
			wantMsg: "user_prompt is required",
		},
		{
			name: "invalid top_k",
			params: InstantRecommendParams{
				ProjectID:  1,
				UserPrompt: "test",
				TopK:       100, // too high
			},
			wantOk:  false,
			wantMsg: "top_k must be between 1 and 50",
		},
		{
			name: "invalid theme",
			params: InstantRecommendParams{
				ProjectID:  1,
				UserPrompt: "test",
				Theme:      "invalid_theme",
			},
			wantOk:  false,
			wantMsg: "invalid theme type",
		},
		{
			name: "valid session_id",
			params: InstantRecommendParams{
				ProjectID:  1,
				UserPrompt: "test prompt",
				SessionID:  "550e8400-e29b-41d4-a716-446655440000",
				TopK:       4,
			},
			wantOk: true,
		},
		{
			name: "invalid session_id length",
			params: InstantRecommendParams{
				ProjectID:  1,
				UserPrompt: "test",
				SessionID:  "invalid-session",
			},
			wantOk:  false,
			wantMsg: "session_id must be a valid UUID",
		},
		{
			name: "invalid session_id format",
			params: InstantRecommendParams{
				ProjectID:  1,
				UserPrompt: "test",
				SessionID:  "550e8400-e29b-41d4-a716-44665544000z", // invalid UUID
			},
			wantOk:  false,
			wantMsg: "invalid session_id format",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, msg := tt.params.Validate()
			if got != tt.wantOk {
				t.Errorf("InstantRecommendParams.Validate() got = %v, want %v", got, tt.wantOk)
			}
			if !tt.wantOk && msg != tt.wantMsg {
				t.Errorf("InstantRecommendParams.Validate() msg = %v, want %v", msg, tt.wantMsg)
			}
		})
	}
}

func TestWordsList_Methods(t *testing.T) {
	words := model.WordsList{"spaceship", "alien", "planet", "cartoon", "exploration"}

	t.Run("ToSlice", func(t *testing.T) {
		slice := words.ToSlice()
		if len(slice) != 5 {
			t.Errorf("Expected 5 words, got %d", len(slice))
		}
		if slice[0] != "spaceship" {
			t.Errorf("Expected first word to be 'spaceship', got %s", slice[0])
		}
	})

	t.Run("IsEmpty", func(t *testing.T) {
		if words.IsEmpty() {
			t.Error("Expected words not to be empty")
		}

		empty := model.WordsList{}
		if !empty.IsEmpty() {
			t.Error("Expected empty words to be empty")
		}
	})

	t.Run("Count", func(t *testing.T) {
		if words.Count() != 5 {
			t.Errorf("Expected count 5, got %d", words.Count())
		}
	})
}

func TestExtractWordsFromResponse(t *testing.T) {
	ctrl := &Controller{}

	tests := []struct {
		name     string
		response string
		want     []string
	}{
		{
			name: "simple newline separated",
			response: `宇宙飞船
外星人
星球
太空站`,
			want: []string{"宇宙飞船", "外星人", "星球", "太空站"},
		},
		{
			name: "with bullet points",
			response: `- 宇宙飞船
• 外星人
* 星球`,
			want: []string{"宇宙飞船", "外星人", "星球"},
		},
		{
			name: "with numbers",
			response: `1. 宇宙飞船
2. 外星人
3. 星球`,
			want: []string{"宇宙飞船", "外星人", "星球"},
		},
		{
			name: "mixed format",
			response: `宇宙飞船
- 外星人
2. 星球
• 太空站`,
			want: []string{"宇宙飞船", "外星人", "星球", "太空站"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ctrl.extractWordsFromResponse(tt.response)
			if len(got) != len(tt.want) {
				t.Errorf("extractWordsFromResponse() got %d words, want %d", len(got), len(tt.want))
			}
			for i, word := range tt.want {
				if i >= len(got) || got[i] != word {
					t.Errorf("extractWordsFromResponse() got %v, want %v", got, tt.want)
					break
				}
			}
		})
	}
}

func TestCleanWords(t *testing.T) {
	ctrl := &Controller{}

	tests := []struct {
		name  string
		input []string
		want  []string
	}{
		{
			name:  "remove duplicates",
			input: []string{"apple", "APPLE", "banana", "Apple"},
			want:  []string{"apple", "banana"},
		},
		{
			name:  "filter length",
			input: []string{"", "a", string(make([]byte, 51)), "good"},
			want:  []string{"a", "good"},
		},
		{
			name:  "limit to 20",
			input: make([]string, 25), // will be filled with "word1", "word2", etc.
		},
	}

	// Fill the third test case
	for i := range tests[2].input {
		tests[2].input[i] = fmt.Sprintf("word%d", i+1)
	}
	tests[2].want = tests[2].input[:20]

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ctrl.cleanWords(tt.input)
			if len(got) != len(tt.want) && tt.name != "limit to 20" {
				t.Errorf("cleanWords() got %d words, want %d", len(got), len(tt.want))
			}
			if tt.name == "limit to 20" && len(got) != 20 {
				t.Errorf("cleanWords() should limit to 20 words, got %d", len(got))
			}
		})
	}
}

func TestEnhancePromptWithContext(t *testing.T) {
	ctrl := &Controller{}

	tests := []struct {
		name         string
		userPrompt   string
		relatedWords []string
		want         string
	}{
		{
			name:         "empty context",
			userPrompt:   "test prompt",
			relatedWords: []string{},
			want:         "test prompt",
		},
		{
			name:         "normal context",
			userPrompt:   "cute astronaut",
			relatedWords: []string{"spaceship", "alien", "planet"},
			want:         "cute astronaut, 相关元素: spaceship, alien, planet",
		},
		{
			name:         "limit to 5 words",
			userPrompt:   "test",
			relatedWords: []string{"word1", "word2", "word3", "word4", "word5", "word6", "word7"},
			want:         "test, 相关元素: word1, word2, word3, word4, word5",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ctrl.enhancePromptWithContext(tt.userPrompt, tt.relatedWords)
			if got != tt.want {
				t.Errorf("enhancePromptWithContext() got = %q, want %q", got, tt.want)
			}
		})
	}
}
