package svggen

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/goplus/builder/spx-backend/internal/config"
	"github.com/goplus/builder/spx-backend/internal/copilot"
	"github.com/goplus/builder/spx-backend/internal/copilot/imagegen"
	"github.com/goplus/builder/spx-backend/internal/log"
	qlog "github.com/qiniu/x/log"
)

// OpenAIService implements OpenAI compatible API calls.
type OpenAIService struct {
	copilot *copilot.Copilot
}

// NewOpenAIService creates a new OpenAI service instance.
func NewOpenAIService(cfg *config.Config, copilot *copilot.Copilot, logger *qlog.Logger) *OpenAIService {
	return &OpenAIService{
		copilot: copilot,
	}
}

// GenerateImage generates SVG code using OpenAI compatible models.
func (s *OpenAIService) GenerateImage(ctx context.Context, req GenerateRequest) (*ImageResponse, error) {
	logger := log.GetReqLogger(ctx)
	logger.Printf("[OPENAI] Starting SVG generation request...")

	// Build SVG generation prompt
	prompt := s.buildSVGPrompt(req.Prompt, req.Style, req.NegativePrompt)

	// Create copilot parameters
	params := &copilot.Params{
		System: copilot.Content{
			Type: copilot.ContentTypeText,
			Text: imagegen.SystemPrompt,
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

	logger.Printf("[OPENAI] Sending request to copilot service")

	// Call copilot service - using premium=false for regular requests
	result, err := s.copilot.Message(ctx, params, false)
	if err != nil {
		logger.Printf("[OPENAI] Copilot request failed: %v", err)
		return nil, fmt.Errorf("copilot request: %w", err)
	}

	logger.Printf("[OPENAI] Received response from copilot")

	// Extract SVG code from response
	svgContent := result.Message.Content.Text
	svgCode := s.extractSVGCode(svgContent)

	if svgCode == "" {
		logger.Printf("[OPENAI] No valid SVG found in response")
		return nil, fmt.Errorf("no valid SVG generated")
	}

	// Generate temporary SVG file URL
	imageID := GenerateImageID(ProviderOpenAI)
	svgURL := s.createSVGDataURL(svgCode)

	logger.Printf("[OPENAI] Successfully generated SVG - ID: %s", imageID)

	return &ImageResponse{
		ID:             imageID,
		Prompt:         req.Prompt,
		NegativePrompt: req.NegativePrompt,
		Style:          req.Style,
		SVGURL:         svgURL,
		PNGURL:         svgURL, // OpenAI generates SVG code, both URLs are the same
		Width:          1024,   // Default size
		Height:         1024,
		CreatedAt:      time.Now(),
		Provider:       ProviderOpenAI,
	}, nil
}

// buildSVGPrompt builds a prompt for generating SVG.
func (s *OpenAIService) buildSVGPrompt(prompt, style, negativePrompt string) string {
	var promptBuilder strings.Builder

	promptBuilder.WriteString("Create a high-quality SVG illustration of: ")
	promptBuilder.WriteString(prompt)

	if style != "" {
		promptBuilder.WriteString(fmt.Sprintf("\n\nArtistic style and visual requirements: %s", style))
	}

	if negativePrompt != "" {
		promptBuilder.WriteString(fmt.Sprintf("\n\nIMPORTANT - Do NOT include these elements: %s", negativePrompt))
	}

	promptBuilder.WriteString(`

Technical Requirements:
• Use viewBox="0 0 1024 1024" for consistent sizing
• Ensure the SVG is completely self-contained and valid
• Use semantic and descriptive element IDs (e.g., id="main-character", id="background-sky")
• Organize elements in logical groups using <g> tags
• Use appropriate colors that match the subject and style
• Include gradients, shadows, or other effects when they enhance the design
• Ensure the illustration is centered and well-composed within the viewBox
• Make it scalable and crisp at any resolution

Visual Quality Standards:
• Pay attention to proper proportions and anatomy
• Use appropriate line weights and stroke styles
• Include relevant details that make the illustration engaging
• Ensure good contrast and readability
• Follow the specified artistic style consistently
• Create depth and dimension through layering and visual effects

Output Format:
Return ONLY the complete SVG code starting with <svg> and ending with </svg>. No explanations, no code blocks, no additional text.
In SVG, do not use elements like rect; all drawing should be implemented via the path element.

`)

	return promptBuilder.String()
}

// extractSVGCode extracts SVG code from the response.
func (s *OpenAIService) extractSVGCode(content string) string {
	// Look for SVG tags
	svgRegex := regexp.MustCompile(`(?s)<svg[^>]*>.*?</svg>`)
	matches := svgRegex.FindString(content)

	if matches != "" {
		return matches
	}

	// If no complete SVG found, try to look for SVG code blocks
	codeBlockRegex := regexp.MustCompile("(?s)```(?:svg|xml)?\n?(.*?)\n?```")
	codeMatches := codeBlockRegex.FindStringSubmatch(content)

	if len(codeMatches) > 1 {
		svgCode := strings.TrimSpace(codeMatches[1])
		if strings.Contains(svgCode, "<svg") {
			return svgCode
		}
	}

	// Finally try to see if the entire content is SVG
	if strings.Contains(content, "<svg") && strings.Contains(content, "</svg>") {
		return strings.TrimSpace(content)
	}

	return ""
}

// createSVGDataURL creates an SVG Data URL.
func (s *OpenAIService) createSVGDataURL(svgCode string) string {
	// For demonstration, we return a data URL
	// In actual production environment, you might want to save to file service and return real URL
	return fmt.Sprintf("data:image/svg+xml;base64,%s",
		s.encodeSVGToBase64(svgCode))
}

// BeautifyImage is not supported by OpenAI provider.
func (s *OpenAIService) BeautifyImage(ctx context.Context, req BeautifyImageRequest) (*BeautifyImageResponse, error) {
	return nil, errors.New("BeautifyImage is not supported by OpenAI provider")
}

// ChangeCharacterStyle is not supported by OpenAI provider.
func (s *OpenAIService) ChangeCharacterStyle(ctx context.Context, req CharacterStyleChangeRequest) (*CharacterStyleChangeResponse, error) {
	return nil, errors.New("ChangeCharacterStyle is not supported by OpenAI provider")
}

// encodeSVGToBase64 encodes SVG to Base64.
func (s *OpenAIService) encodeSVGToBase64(svgCode string) string {
	return base64.StdEncoding.EncodeToString([]byte(svgCode))
}


