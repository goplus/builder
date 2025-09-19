package controller

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/model"
	"github.com/goplus/builder/spx-backend/internal/svggen"
)

var validProviders = []svggen.Provider{
	svggen.ProviderSVGIO,
	svggen.ProviderRecraft,
	svggen.ProviderOpenAI,
}

// GenerateSVGParams represents parameters for SVG generation.
type GenerateSVGParams struct {
	Prompt         string          `json:"prompt"`
	NegativePrompt string          `json:"negative_prompt,omitempty"`
	Style          string          `json:"style,omitempty"`
	Theme          ThemeType       `json:"theme,omitempty"`
	Provider       svggen.Provider `json:"provider,omitempty"`
	Format         string          `json:"format,omitempty"`
	SkipTranslate  bool            `json:"skip_translate,omitempty"`
	Model          string          `json:"model,omitempty"`
	Size           string          `json:"size,omitempty"`
	Substyle       string          `json:"substyle,omitempty"`
	NumImages      int             `json:"n,omitempty"`
	IsOptimized    bool            `json:"-"` // Internal flag to indicate if prompt is already optimized
}

// Validate validates the SVG generation parameters.
func (p *GenerateSVGParams) Validate() (bool, string) {
	if len(p.Prompt) < 3 {
		return false, "prompt must be at least 3 characters"
	}

	// Auto-select provider based on theme if not specified (skip if already optimized)
	if p.Provider == "" && !p.IsOptimized {
		if p.Theme != ThemeNone {
			p.Provider = GetThemeRecommendedProvider(p.Theme)
		} else {
			p.Provider = svggen.ProviderSVGIO // Default fallback
		}
	}

	// Validate provider
	isValid := false
	for _, vp := range validProviders {
		if p.Provider == vp {
			isValid = true
			break
		}
	}
	if !isValid {
		return false, "provider must be one of: svgio, recraft, openai"
	}

	// Validate theme
	if !IsValidTheme(p.Theme) {
		return false, "invalid theme type"
	}

	return true, ""
}

// GenerateImageParams represents parameters for image generation (metadata only).
type GenerateImageParams struct {
	GenerateSVGParams
}

// SVGResponse represents the response for direct SVG requests.
type SVGResponse struct {
	Data          []byte            `json:"-"`                    // SVG content
	Headers       map[string]string `json:"-"`                    // Response headers
	KodoURL       string            `json:"kodo_url,omitempty"`   // Kodo storage URL if stored
	AIResourceID  int64             `json:"ai_resource_id,omitempty"` // Database record ID if stored
}

// ImageResponse represents the response for image metadata requests.
type ImageResponse struct {
	ID               string            `json:"id"`
	SVGURL           string            `json:"svg_url"`
	PNGURL           string            `json:"png_url,omitempty"`
	KodoSVGURL       string            `json:"kodo_svg_url,omitempty"`      // Kodo storage URL for SVG
	AIResourceID     int64             `json:"ai_resource_id,omitempty"`    // Database record ID if stored
	Width            int               `json:"width"`
	Height           int               `json:"height"`
	Provider         svggen.Provider   `json:"provider"`
	OriginalPrompt   string            `json:"original_prompt,omitempty"`
	TranslatedPrompt string            `json:"translated_prompt,omitempty"`
	WasTranslated    bool              `json:"was_translated"`
	CreatedAt        time.Time         `json:"created_at"`
}

// GenerateSVG generates an SVG image and returns the SVG content directly.
func (ctrl *Controller) GenerateSVG(ctx context.Context, params *GenerateSVGParams) (*SVGResponse, error) {
	logger := log.GetReqLogger(ctx)
	logger.Printf("GenerateSVG request - provider: %s, theme: %s, prompt: %q, optimized: %v", params.Provider, params.Theme, params.Prompt, params.IsOptimized)

	// Skip redundant theme/provider validation if prompt is already optimized
	if !params.IsOptimized && params.Theme != ThemeNone {
		recommendedProvider := GetThemeRecommendedProvider(params.Theme)
		if params.Provider == recommendedProvider {
			logger.Printf("Using theme-recommended provider: %s for theme: %s", params.Provider, params.Theme)
		}
	}

	// Use prompt as-is when already optimized, otherwise could apply additional processing
	finalPrompt := params.Prompt

	// Convert to svggen request
	req := svggen.GenerateRequest{
		Prompt:         finalPrompt,
		NegativePrompt: params.NegativePrompt,
		Style:          params.Style,
		Theme:          string(params.Theme),
		Provider:       params.Provider,
		Format:         params.Format,
		SkipTranslate:  params.SkipTranslate,
		Model:          params.Model,
		Size:           params.Size,
		Substyle:       params.Substyle,
		NumImages:      params.NumImages,
	}

	// Generate image
	result, err := ctrl.svggen.GenerateImage(ctx, req)
	if err != nil {
		logger.Printf("SVG generation failed: %v", err)
		return nil, fmt.Errorf("failed to generate SVG: %w", err)
	}

	logger.Printf("SVG generation successful - ID: %s", result.ID)

	// Download or parse SVG content
	svgBytes, err := ctrl.getSVGContent(ctx, result.SVGURL)
	if err != nil {
		logger.Printf("Failed to get SVG content: %v", err)
		return nil, fmt.Errorf("failed to get SVG content: %w", err)
	}

	// Store SVG to Kodo
	var kodoURL string
	var aiResourceID int64
	filename := fmt.Sprintf("%s.svg", result.ID)
	uploadStart := time.Now()
	uploadResult, err := ctrl.kodo.UploadFile(ctx, svgBytes, filename)
	logger.Printf("[PERF] Kodo upload took %v", time.Since(uploadStart))
	if err != nil {
		logger.Printf("Failed to upload SVG to Kodo: %v", err)
		// Continue without Kodo storage, don't fail the request
	} else {
		kodoURL = uploadResult.KodoURL
		logger.Printf("SVG uploaded to Kodo: %s", kodoURL)

		// Save to database if Kodo upload successful
		aiResource := &model.AIResource{
			URL: kodoURL,
		}
		if dbErr := ctrl.db.Create(aiResource).Error; dbErr != nil {
			logger.Printf("Failed to save AI resource to database: %v", dbErr)
		} else {
			aiResourceID = aiResource.ID
			logger.Printf("AI resource saved to database with ID: %d", aiResourceID)
			
			// Call vector service to add SVG data
			vectorStart := time.Now()
			if vectorErr := ctrl.callVectorService(ctx, aiResourceID, kodoURL, svgBytes); vectorErr != nil {
				logger.Printf("Failed to call vector service: %v", vectorErr)
				// Don't fail the request, just log the error
			} else {
				logger.Printf("[PERF] Vector service call took %v", time.Since(vectorStart))
			}
		}
	}


	// Prepare response headers
	headers := map[string]string{
		"Content-Type":        "image/svg+xml",
		"Content-Disposition": fmt.Sprintf("attachment; filename=\"%s.svg\"", result.ID),
		"X-Image-Id":          result.ID,
		"X-Image-Width":       strconv.Itoa(result.Width),
		"X-Image-Height":      strconv.Itoa(result.Height),
		"X-Provider":          string(result.Provider),
	}
	
	// Add Kodo URL to headers if available
	if kodoURL != "" {
		headers["X-Kodo-URL"] = kodoURL
	}

	// Add translation info if available
	if result.WasTranslated {
		headers["X-Original-Prompt"] = result.OriginalPrompt
		headers["X-Translated-Prompt"] = result.TranslatedPrompt
		headers["X-Was-Translated"] = "true"
	}

	return &SVGResponse{
		Data:         svgBytes,
		Headers:      headers,
		KodoURL:      kodoURL,
		AIResourceID: aiResourceID,
	}, nil
}

// GenerateImage generates an image and returns metadata information.
func (ctrl *Controller) GenerateImage(ctx context.Context, params *GenerateImageParams) (*ImageResponse, error) {
	logger := log.GetReqLogger(ctx)
	logger.Printf("GenerateImage request - provider: %s, theme: %s, prompt: %q, optimized: %v", params.Provider, params.Theme, params.Prompt, params.IsOptimized)

	// Skip redundant theme/provider validation if prompt is already optimized
	if !params.IsOptimized && params.Theme != ThemeNone {
		recommendedProvider := GetThemeRecommendedProvider(params.Theme)
		if params.Provider == recommendedProvider {
			logger.Printf("Using theme-recommended provider: %s for theme: %s", params.Provider, params.Theme)
		}
	}

	// Use prompt as-is when already optimized, otherwise could apply additional processing
	finalPrompt := params.Prompt

	// Convert to svggen request
	req := svggen.GenerateRequest{
		Prompt:         finalPrompt,
		NegativePrompt: params.NegativePrompt,
		Style:          params.Style,
		Theme:          string(params.Theme),
		Provider:       params.Provider,
		Format:         params.Format,
		SkipTranslate:  params.SkipTranslate,
		Model:          params.Model,
		Size:           params.Size,
		Substyle:       params.Substyle,
		NumImages:      params.NumImages,
	}

	// Generate image
	result, err := ctrl.svggen.GenerateImage(ctx, req)
	if err != nil {
		logger.Printf("Image generation failed: %v", err)
		return nil, fmt.Errorf("failed to generate image: %w", err)
	}

	logger.Printf("Image generation successful - ID: %s", result.ID)

	// Store SVG to Kodo if possible
	var kodoSVGURL string
	var aiResourceID int64
	
	if result.SVGURL != "" {
		svgBytes, err := ctrl.getSVGContent(ctx, result.SVGURL)
		if err != nil {
			logger.Printf("Failed to get SVG content for Kodo storage: %v", err)
		} else {
			filename := fmt.Sprintf("%s.svg", result.ID)
			uploadResult, err := ctrl.kodo.UploadFile(ctx, svgBytes, filename)
			if err != nil {
				logger.Printf("Failed to upload SVG to Kodo: %v", err)
			} else {
				kodoSVGURL = uploadResult.KodoURL
				logger.Printf("SVG uploaded to Kodo: %s", kodoSVGURL)

				// Save to database if Kodo upload successful
				aiResource := &model.AIResource{
					URL: kodoSVGURL,
				}
				if dbErr := ctrl.db.Create(aiResource).Error; dbErr != nil {
					logger.Printf("Failed to save AI resource to database: %v", dbErr)
				} else {
					aiResourceID = aiResource.ID
					logger.Printf("AI resource saved to database with ID: %d", aiResourceID)
					
					// Call vector service to add SVG data
					if vectorErr := ctrl.callVectorService(ctx, aiResourceID, kodoSVGURL, svgBytes); vectorErr != nil {
						logger.Printf("Failed to call vector service: %v", vectorErr)
						// Don't fail the request, just log the error
					}
				}
			}
		}
	}

	return &ImageResponse{
		ID:               result.ID,
		SVGURL:           result.SVGURL,
		PNGURL:           result.PNGURL,
		KodoSVGURL:       kodoSVGURL,
		AIResourceID:     aiResourceID,
		Width:            result.Width,
		Height:           result.Height,
		Provider:         result.Provider,
		OriginalPrompt:   result.OriginalPrompt,
		TranslatedPrompt: result.TranslatedPrompt,
		WasTranslated:    result.WasTranslated,
		CreatedAt:        result.CreatedAt,
	}, nil
}

// callVectorService calls the vector service API to add SVG data
func (ctrl *Controller) callVectorService(ctx context.Context, id int64, url string, svgContent []byte) error {
	return ctrl.algorithmService.AddVector(ctx, id, url, svgContent)
}
	
// getSVGContent retrieves SVG content from URL or data URL.
func (ctrl *Controller) getSVGContent(ctx context.Context, svgURL string) ([]byte, error) {
	if strings.HasPrefix(svgURL, "data:") {
		// Parse data URL
		return ctrl.parseDataURL(svgURL)
	}

	// Download from HTTP URL
	return svggen.DownloadFile(ctx, svgURL)
}

// parseDataURL parses a data URL and returns the decoded content.
func (ctrl *Controller) parseDataURL(dataURL string) ([]byte, error) {
	// data URL format: data:[<mediatype>][;base64],<data>
	// e.g., data:image/svg+xml;base64,<base64-encoded-data>

	if !strings.HasPrefix(dataURL, "data:") {
		return nil, errors.New("invalid data URL: missing data: prefix")
	}

	// Remove "data:" prefix
	dataURL = dataURL[5:]

	// Find comma separator
	commaIndex := strings.Index(dataURL, ",")
	if commaIndex == -1 {
		return nil, errors.New("invalid data URL: missing comma separator")
	}

	// Get media type and encoding info
	mediaType := dataURL[:commaIndex]
	data := dataURL[commaIndex+1:]

	// Check if it's base64 encoded
	if strings.Contains(mediaType, "base64") {
		// Base64 decode
		decoded, err := base64.StdEncoding.DecodeString(data)
		if err != nil {
			return nil, fmt.Errorf("failed to decode base64 data: %w", err)
		}
		return decoded, nil
	}

	// Not base64 encoded, return string bytes directly
	return []byte(data), nil
}

// GetThemes returns all available themes with their information.
func (ctrl *Controller) GetThemes(ctx context.Context) ([]ThemeInfo, error) {
	logger := log.GetReqLogger(ctx)
	logger.Printf("GetThemes request")

	themes := GetAllThemesInfo()

	logger.Printf("Returned %d themes", len(themes))
	return themes, nil
}
