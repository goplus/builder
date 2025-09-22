package svggen

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"mime/multipart"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/goplus/builder/spx-backend/internal/config"
	"github.com/goplus/builder/spx-backend/internal/log"
	qlog "github.com/qiniu/x/log"
)

// RecraftService implements Recraft API calls.
type RecraftService struct {
	config     *config.RecraftConfig
	httpClient *http.Client
	logger     *qlog.Logger
}

// NewRecraftService creates a new Recraft service instance.
func NewRecraftService(cfg *config.Config, httpClient *http.Client, logger *qlog.Logger) *RecraftService {
	return &RecraftService{
		config:     &cfg.Providers.Recraft,
		httpClient: httpClient,
		logger:     logger,
	}
}

// GenerateImage generates an image using Recraft API.
func (s *RecraftService) GenerateImage(ctx context.Context, req GenerateRequest) (*ImageResponse, error) {
	logger := log.GetReqLogger(ctx)
	logger.Printf("[RECRAFT] Starting generation request...")

	// Build optimized prompt (add transparent background requirement)
	enhancedPrompt, enhancedNegativePrompt := s.buildRecraftPrompt(req.Prompt, req.Style, req.NegativePrompt)

	logger.Printf("[RECRAFT] Original prompt: %s", req.Prompt)
	logger.Printf("[RECRAFT] Enhanced prompt: %s", enhancedPrompt)
	logger.Printf("[RECRAFT] Enhanced negative prompt: %s", enhancedNegativePrompt)

	// Build Recraft API request
	recraftReq := RecraftGenerateReq{
		Prompt:         enhancedPrompt,
		NegativePrompt: enhancedNegativePrompt,
		Style:          req.Style,
		Substyle:       req.Substyle,
		Model:          req.Model,
		Size:           req.Size,
		N:              req.NumImages,
		ResponseFormat: "url", // Fixed to use URL format
	}

	// Set default values
	if recraftReq.Model == "" {
		recraftReq.Model = s.config.DefaultModel
	}
	if recraftReq.Size == "" {
		recraftReq.Size = "1024x1024"
	}
	if recraftReq.Style == "" {
		recraftReq.Style = "vector_illustration"
	}
	if recraftReq.N == 0 {
		recraftReq.N = 1
	}

	body, err := json.Marshal(recraftReq)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	url := s.config.BaseURL + s.config.Endpoints.Generate
	logger.Printf("[RECRAFT] Sending request to %s with payload size: %d bytes", url, len(body))

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+s.getAPIKey())

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		logger.Printf("[RECRAFT] HTTP request failed: %v", err)
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	logger.Printf("[RECRAFT] Received response with status: %s", resp.Status)

	if resp.StatusCode >= 300 {
		var errResp map[string]interface{}
		_ = json.NewDecoder(resp.Body).Decode(&errResp)
		logger.Printf("[RECRAFT] Error response body: %+v", errResp)
		return nil, fmt.Errorf("recraft API error: %s", resp.Status)
	}

	var recraftResp RecraftGenerateResp
	if err := json.NewDecoder(resp.Body).Decode(&recraftResp); err != nil {
		logger.Printf("[RECRAFT] Failed to decode response: %v", err)
		return nil, fmt.Errorf("decode response: %w", err)
	}

	if len(recraftResp.Data) == 0 {
		logger.Printf("[RECRAFT] No images in response")
		return nil, errors.New("no images generated")
	}

	imageData := recraftResp.Data[0] // Take the first image
	logger.Printf("[RECRAFT] Successfully parsed response - URL: %s", imageData.URL)

	// Parse image dimensions
	width, height := s.parseSizeFromString(recraftReq.Size)

	// Generate a simple ID (Recraft doesn't provide one)
	imageID := GenerateImageID(ProviderRecraft)

	// For Recraft, we need to convert the image to SVG
	// Here we can use Recraft's vectorize API
	svgURL := imageData.URL // Default to original image

	// If SVG is needed, call vectorize API
	if req.Format == "svg" || strings.Contains(req.Style, "vector") {
		vectorizedURL, err := s.vectorizeImage(ctx, imageData.URL)
		if err != nil {
			logger.Printf("[RECRAFT] Vectorization failed: %v", err)
			// Continue with original image on failure
		} else {
			svgURL = vectorizedURL
		}
	}

	return &ImageResponse{
		ID:             imageID,
		Prompt:         req.Prompt,
		NegativePrompt: req.NegativePrompt,
		Style:          recraftReq.Style,
		SVGURL:         svgURL,
		PNGURL:         imageData.URL,
		Width:          width,
		Height:         height,
		CreatedAt:      time.Unix(int64(recraftResp.Created), 0),
		Provider:       ProviderRecraft,
	}, nil
}

// vectorizeImage uses Recraft's vectorization API to convert image to SVG.
func (s *RecraftService) vectorizeImage(ctx context.Context, imageURL string) (string, error) {
	logger := log.GetReqLogger(ctx)
	logger.Printf("[RECRAFT] Vectorizing image: %s", imageURL)

	// Download image
	imageBytes, err := DownloadFile(ctx, imageURL)
	if err != nil {
		return "", fmt.Errorf("download image: %w", err)
	}

	// Create multipart form
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	// Add image file
	part, err := writer.CreateFormFile("file", "image.png")
	if err != nil {
		return "", fmt.Errorf("create form file: %w", err)
	}
	_, err = part.Write(imageBytes)
	if err != nil {
		return "", fmt.Errorf("write image data: %w", err)
	}

	// Add response_format parameter
	writer.WriteField("response_format", "url")
	writer.Close()

	url := s.config.BaseURL + s.config.Endpoints.Vectorize
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, &buf)
	if err != nil {
		return "", fmt.Errorf("create vectorize request: %w", err)
	}

	httpReq.Header.Set("Content-Type", writer.FormDataContentType())
	httpReq.Header.Set("Authorization", "Bearer "+s.getAPIKey())

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("vectorize request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("vectorize API error: %s", resp.Status)
	}

	var vectorizeResp RecraftVectorizeResp
	if err := json.NewDecoder(resp.Body).Decode(&vectorizeResp); err != nil {
		return "", fmt.Errorf("decode vectorize response: %w", err)
	}

	logger.Printf("[RECRAFT] Vectorization successful - SVG URL: %s", vectorizeResp.Image.URL)
	return vectorizeResp.Image.URL, nil
}

// parseSizeFromString parses size string like "1024x1024".
func (s *RecraftService) parseSizeFromString(size string) (width, height int) {
	parts := strings.Split(size, "x")
	if len(parts) != 2 {
		return 1024, 1024 // Default value
	}

	width, _ = strconv.Atoi(parts[0])
	height, _ = strconv.Atoi(parts[1])

	if width <= 0 {
		width = 1024
	}
	if height <= 0 {
		height = 1024
	}

	return width, height
}

// buildRecraftPrompt builds Recraft prompt, automatically adding transparent background requirement.
func (s *RecraftService) buildRecraftPrompt(prompt, style, negativePrompt string) (string, string) {
	var promptBuilder strings.Builder
	var negativeBuilder strings.Builder

	// Build main prompt
	promptBuilder.WriteString(prompt)
	promptBuilder.WriteString(", 背景色为透明色，不要背景边框")

	// Build negative prompt
	if negativePrompt != "" {
		negativeBuilder.WriteString(negativePrompt)
		negativeBuilder.WriteString(", ")
	}

	// Add default background-related negative prompts

	return promptBuilder.String(), negativeBuilder.String()
}

// BeautifyImage beautifies an image using Recraft's image-to-image API.
func (s *RecraftService) BeautifyImage(ctx context.Context, req BeautifyImageRequest) (*BeautifyImageResponse, error) {
	logger := log.GetReqLogger(ctx)
	logger.Printf("[RECRAFT] Starting image beautification request...")

	// Validate request
	if len(req.ImageData) == 0 {
		return nil, errors.New("image data is required")
	}
	if req.Prompt == "" {
		return nil, errors.New("prompt is required")
	}
	if req.Strength < 0 || req.Strength > 1 {
		return nil, errors.New("strength must be between 0 and 1")
	}

	logger.Printf("[RECRAFT] Prompt: %s", req.Prompt)
	logger.Printf("[RECRAFT] Strength: %.2f", req.Strength)

	// Create multipart form
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	// Add image file
	part, err := writer.CreateFormFile("image", "image.png")
	if err != nil {
		return nil, fmt.Errorf("create form file: %w", err)
	}
	_, err = part.Write(req.ImageData)
	if err != nil {
		return nil, fmt.Errorf("write image data: %w", err)
	}

	// Add form fields
	writer.WriteField("prompt", req.Prompt)
	writer.WriteField("strength", fmt.Sprintf("%.2f", req.Strength))
	writer.WriteField("response_format", "url")

	// Set default values
	if req.Style == "" {
		req.Style = "realistic_image"
	}
	writer.WriteField("style", req.Style)

	if req.SubStyle != "" {
		writer.WriteField("sub_style", req.SubStyle)
	}

	if req.NegativePrompt != "" {
		writer.WriteField("negative_prompt", req.NegativePrompt)
	}

	// Default to 1 image
	writer.WriteField("n", "1")

	// Set model
	model := s.config.DefaultModel
	if model == "" {
		model = "recraftv3"
	}
	writer.WriteField("model", model)

	writer.Close()

	// Build request URL
	url := s.config.BaseURL + s.config.Endpoints.ImageToImage
	logger.Printf("[RECRAFT] Sending image-to-image request to %s with payload size: %d bytes", url, buf.Len())

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, &buf)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", writer.FormDataContentType())
	httpReq.Header.Set("Authorization", "Bearer "+s.getAPIKey())

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		logger.Printf("[RECRAFT] HTTP request failed: %v", err)
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	logger.Printf("[RECRAFT] Received response with status: %s", resp.Status)

	if resp.StatusCode >= 300 {
		var errResp map[string]interface{}
		_ = json.NewDecoder(resp.Body).Decode(&errResp)
		logger.Printf("[RECRAFT] Error response body: %+v", errResp)
		return nil, fmt.Errorf("recraft API error: %s", resp.Status)
	}

	var recraftResp RecraftImageToImageResp
	if err := json.NewDecoder(resp.Body).Decode(&recraftResp); err != nil {
		logger.Printf("[RECRAFT] Failed to decode response: %v", err)
		return nil, fmt.Errorf("decode response: %w", err)
	}

	if len(recraftResp.Data) == 0 {
		logger.Printf("[RECRAFT] No images in response")
		return nil, errors.New("no images generated")
	}

	imageData := recraftResp.Data[0] // Take the first image
	logger.Printf("[RECRAFT] Successfully beautified image - URL: %s", imageData.URL)

	// Generate a simple ID
	imageID := GenerateImageID(ProviderRecraft)

	return &BeautifyImageResponse{
		ID:             imageID,
		OriginalPrompt: req.Prompt,
		Prompt:         req.Prompt,
		NegativePrompt: req.NegativePrompt,
		Style:          req.Style,
		Strength:       req.Strength,
		URL:            imageData.URL,
		Width:          1024, // Default, as Recraft doesn't provide dimensions in response
		Height:         1024, // Default, as Recraft doesn't provide dimensions in response
		CreatedAt:      time.Unix(int64(recraftResp.Created), 0),
		Provider:       ProviderRecraft,
	}, nil
}

// getAPIKey gets the API key from environment or configuration.
func (s *RecraftService) getAPIKey() string {
	// Get API key from environment variable
	// In production, consider using a more secure method like AWS Secrets Manager
	return os.Getenv("RECRAFT_API_KEY")
}
