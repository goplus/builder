package svggen

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/goplus/builder/spx-backend/internal/config"
	"github.com/goplus/builder/spx-backend/internal/log"
	qlog "github.com/qiniu/x/log"
)

// TranslateService defines the contract for translation services.
type TranslateService interface {
	Translate(ctx context.Context, text string) (string, error)
}

// OpenAITranslateService implements translation using OpenAI compatible APIs.
type OpenAITranslateService struct {
	config     *config.OpenAISVGConfig
	httpClient *http.Client
	logger     *qlog.Logger
}

// NewOpenAITranslateService creates a new OpenAI translation service instance.
func NewOpenAITranslateService(cfg *config.Config, httpClient *http.Client, logger *qlog.Logger) *OpenAITranslateService {
	return &OpenAITranslateService{
		config:     &cfg.Providers.SVGOpenAI,
		httpClient: httpClient,
		logger:     logger,
	}
}

// Translate translates text from Chinese to English for image generation prompts.
func (s *OpenAITranslateService) Translate(ctx context.Context, text string) (string, error) {
	logger := log.GetReqLogger(ctx)

	// Check if text contains Chinese characters
	if !containsChinese(text) {
		logger.Printf("[TRANSLATE] Text appears to be English already, skipping translation: %q", text)
		return text, nil
	}

	logger.Printf("[TRANSLATE] Translating text: %q", text)

	prompt := fmt.Sprintf(`Please translate the following text to English, maintaining the original meaning and making it suitable for AI image generation prompts. Return only the translation result without any explanation:

%s`, text)

	reqBody := OpenAIGenerateReq{
		Model: s.config.DefaultModel,
		Messages: []OpenAIMessage{
			{
				Role:    "user",
				Content: prompt,
			},
		},
		MaxTokens:   150,
		Temperature: 0.3,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("marshal translate request: %w", err)
	}

	url := s.config.BaseURL + "chat/completions"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(jsonData))
	if err != nil {
		return "", fmt.Errorf("create translate request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.getAPIKey())

	resp, err := s.httpClient.Do(req)
	if err != nil {
		logger.Printf("[TRANSLATE] HTTP request failed: %v", err)
		return "", fmt.Errorf("http translate request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		var errResp map[string]any
		_ = json.NewDecoder(resp.Body).Decode(&errResp)
		logger.Printf("[TRANSLATE] Error response body: %+v", errResp)
		return "", fmt.Errorf("translate API error: %s", resp.Status)
	}

	var translateResp OpenAIGenerateResp
	if err := json.NewDecoder(resp.Body).Decode(&translateResp); err != nil {
		return "", fmt.Errorf("decode translate response: %w", err)
	}

	if len(translateResp.Choices) == 0 {
		return "", errors.New("no translation choices returned")
	}

	translated := strings.TrimSpace(translateResp.Choices[0].Message.Content)
	logger.Printf("[TRANSLATE] Translation result: %q -> %q", text, translated)

	return translated, nil
}

// getAPIKey gets the API key from the same source as OpenAI service.
func (s *OpenAITranslateService) getAPIKey() string {
	// Use the same API key as OpenAI SVG generation
	return getOpenAIAPIKey()
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

// getOpenAIAPIKey is a helper function to get OpenAI API key.
// This should match the implementation in openai.go
func getOpenAIAPIKey() string {
	// Implementation matches openai.go getAPIKey method
	return os.Getenv("SVG_OPENAI_API_KEY")
}
