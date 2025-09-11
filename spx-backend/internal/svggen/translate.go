package svggen

import (
	"context"
	"fmt"
	"strings"

	"github.com/goplus/builder/spx-backend/internal/copilot"
	"github.com/goplus/builder/spx-backend/internal/copilot/translate"
	"github.com/goplus/builder/spx-backend/internal/log"
)

// TranslateService defines the contract for translation services.
type TranslateService interface {
	Translate(ctx context.Context, text string) (string, error)
}

// CopilotTranslateService implements translation using the copilot package.
type CopilotTranslateService struct {
	copilot *copilot.Copilot
}

// NewCopilotTranslateService creates a new copilot translation service instance.
func NewCopilotTranslateService(copilot *copilot.Copilot) *CopilotTranslateService {
	return &CopilotTranslateService{
		copilot: copilot,
	}
}

// Translate translates text from Chinese to English for image generation prompts.
func (s *CopilotTranslateService) Translate(ctx context.Context, text string) (string, error) {
	logger := log.GetReqLogger(ctx)

	// Check if text contains Chinese characters
	if !containsChinese(text) {
		logger.Printf("[TRANSLATE] Text appears to be English already, skipping translation: %q", text)
		return text, nil
	}

	logger.Printf("[TRANSLATE] Translating text: %q", text)

	prompt := fmt.Sprintf(`Please translate the following text to English, maintaining the original meaning and making it suitable for AI image generation prompts. Return only the translation result without any explanation:

%s`, text)

	// Create copilot parameters
	params := &copilot.Params{
		System: copilot.Content{
			Type: copilot.ContentTypeText,
			Text: translate.SystemPrompt,
		},
		Messages: []copilot.Message{
			{
				Role: copilot.RoleUser,
				Content: copilot.Content{
					Type: copilot.ContentTypeText,
					Text: prompt,
				},
			},
		},
	}

	logger.Printf("[TRANSLATE] Sending request to copilot service")

	// Call copilot service - using premium=false for translation
	result, err := s.copilot.Message(ctx, params, false)
	if err != nil {
		logger.Printf("[TRANSLATE] Copilot request failed: %v", err)
		return "", fmt.Errorf("copilot request: %w", err)
	}

	translated := strings.TrimSpace(result.Message.Content.Text)
	logger.Printf("[TRANSLATE] Translation result: %q -> %q", text, translated)

	return translated, nil
}


// containsChinese checks if text contains Chinese characters.
func containsChinese(text string) bool {
	for _, char := range text {
		if char >= 0x4e00 && char <= 0x9fff {
			return true
		}
	}
	return false
}

