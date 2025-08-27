package svggen

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/goplus/builder/spx-backend/internal/config"
	"github.com/goplus/builder/spx-backend/internal/log"
	qlog "github.com/qiniu/x/log"
)

// OpenAIService implements OpenAI compatible API calls.
type OpenAIService struct {
	config     *config.OpenAISVGConfig
	httpClient *http.Client
	logger     *qlog.Logger
}

// NewOpenAIService creates a new OpenAI service instance.
func NewOpenAIService(cfg *config.Config, httpClient *http.Client, logger *qlog.Logger) *OpenAIService {
	return &OpenAIService{
		config:     &cfg.Providers.SVGOpenAI,
		httpClient: httpClient,
		logger:     logger,
	}
}

// GenerateImage generates SVG code using OpenAI compatible models.
func (s *OpenAIService) GenerateImage(ctx context.Context, req GenerateRequest) (*ImageResponse, error) {
	logger := log.GetReqLogger(ctx)
	logger.Printf("[OPENAI] Starting SVG generation request...")

	// OpenAI supports Chinese natively, so we use the prompt as-is
	// Translation is handled at the ServiceManager level if needed

	// Build OpenAI prompt
	prompt := s.buildSVGPrompt(req.Prompt, req.Style, req.NegativePrompt)

	// Build OpenAI API request
	openaiReq := OpenAIGenerateReq{
		Model:       s.getModelFromConfig(req.Model),
		MaxTokens:   s.config.MaxTokens,
		Temperature: s.config.Temperature,
		Messages: []OpenAIMessage{
			{
				Role: "system",
				Content: `You are a world-class SVG graphics designer and vector artist with expertise in creating stunning, precise, and semantically meaningful SVG illustrations. Your specialties include:

1. **Technical Excellence**: You create perfectly valid, optimized SVG code that renders flawlessly across all browsers and devices
2. **Visual Design**: You have an exceptional eye for composition, color theory, typography, and visual hierarchy
3. **Style Adaptation**: You can seamlessly adapt to any artistic style - from minimalist line art to detailed illustrations, from cartoon to realistic, from modern flat design to vintage aesthetics
4. **Semantic Structure**: You use meaningful element IDs, proper grouping, and clean hierarchical structure in your SVG code
5. **Optimization**: Your SVG code is clean, efficient, and follows best practices for file size and performance

When creating SVG graphics, you:
- Pay careful attention to the exact subject, style, and mood requested
- Use appropriate colors, gradients, and visual effects to match the desired aesthetic
- Ensure proper proportions, perspective, and composition
- Add fine details that enhance the overall quality and realism
- Create scalable graphics that look crisp at any size
- Follow accessibility best practices when relevant

You respond ONLY with clean, valid SVG code - no explanations, no code blocks, just the pure SVG markup ready to render.`,
			},
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	body, err := json.Marshal(openaiReq)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	url := s.config.BaseURL + "chat/completions"
	logger.Printf("[OPENAI] Sending request to %s", url)

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+s.getAPIKey())

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		logger.Printf("[OPENAI] HTTP request failed: %v", err)
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	logger.Printf("[OPENAI] Received response with status: %s", resp.Status)

	if resp.StatusCode >= 300 {
		var errResp map[string]any
		_ = json.NewDecoder(resp.Body).Decode(&errResp)
		logger.Printf("[OPENAI] Error response body: %+v", errResp)
		return nil, fmt.Errorf("openai API error: %s", resp.Status)
	}

	var openaiResp OpenAIGenerateResp
	if err := json.NewDecoder(resp.Body).Decode(&openaiResp); err != nil {
		logger.Printf("[OPENAI] Failed to decode response: %v", err)
		return nil, fmt.Errorf("decode openai response: %w", err)
	}

	// Add debug information
	logger.Printf("[OPENAI] Response structure: ID=%s, Object=%s, Model=%s, Choices length=%d",
		openaiResp.ID, openaiResp.Object, openaiResp.Model, len(openaiResp.Choices))

	// If there's content, print the first choice's content
	if len(openaiResp.Choices) > 0 {
		firstChoice := openaiResp.Choices[0]
		logger.Printf("[OPENAI] First choice: Role=%s, Content prefix=%s",
			firstChoice.Message.Role, s.truncateString(firstChoice.Message.Content, 100))
	}

	if len(openaiResp.Choices) == 0 {
		logger.Printf("[OPENAI] Choices array is empty, response: %+v", openaiResp)
		return nil, fmt.Errorf("no choices in openai response")
	}

	// Extract SVG code
	svgContent := openaiResp.Choices[0].Message.Content
	svgCode := s.extractSVGCode(svgContent)

	if svgCode == "" {
		logger.Printf("[OPENAI] No valid SVG found in response")
		return nil, fmt.Errorf("no valid SVG generated")
	}

	// Generate temporary SVG file URL (in actual application, might need to save to file service)
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

// encodeSVGToBase64 encodes SVG to Base64.
func (s *OpenAIService) encodeSVGToBase64(svgCode string) string {
	return base64.StdEncoding.EncodeToString([]byte(svgCode))
}

// truncateString truncates string for logging.
func (s *OpenAIService) truncateString(str string, maxLen int) string {
	if len(str) <= maxLen {
		return str
	}
	return str[:maxLen] + "..."
}

// getModelFromConfig gets model name from configuration or request.
func (s *OpenAIService) getModelFromConfig(requestModel string) string {
	if requestModel != "" {
		return requestModel
	}
	return s.config.DefaultModel
}

// getAPIKey gets the API key from environment or configuration.
func (s *OpenAIService) getAPIKey() string {
	// Get API key from environment variable
	// In production, consider using a more secure method like AWS Secrets Manager
	return os.Getenv("SVG_OPENAI_API_KEY")
}
