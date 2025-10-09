package svggen

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"time"

	"github.com/goplus/builder/spx-backend/internal/config"
	"github.com/goplus/builder/spx-backend/internal/log"
	qlog "github.com/qiniu/x/log"
)

// SVGIOService implements SVG.IO API calls.
type SVGIOService struct {
	config     *config.SVGIOConfig
	httpClient *http.Client
	logger     *qlog.Logger
}

// NewSVGIOService creates a new SVG.IO service instance.
func NewSVGIOService(cfg *config.Config, httpClient *http.Client, logger *qlog.Logger) *SVGIOService {
	return &SVGIOService{
		config:     &cfg.Providers.SVGIO,
		httpClient: httpClient,
		logger:     logger,
	}
}

// svgioGenerateReq represents SVG.IO API generation request.
type svgioGenerateReq struct {
	Prompt         string  `json:"prompt"`
	NegativePrompt *string `json:"negativePrompt,omitempty"`
	Style          *string `json:"style,omitempty"`
}

// svgioGenerateResp represents SVG.IO API generation response.
type svgioGenerateResp struct {
	Success bool `json:"success"`
	Data    []struct {
		ID             string `json:"id"`
		Prompt         string `json:"prompt"`
		NegativePrompt string `json:"negativePrompt"`
		Style          string `json:"style"`
		SVGURL         string `json:"svgUrl"`
		PNGURL         string `json:"pngUrl"`
		Width          int    `json:"width"`
		Height         int    `json:"height"`
		CreatedAt      string `json:"createdAt"`
	} `json:"data"`
}

// GenerateImage generates an image using SVG.IO API.
func (s *SVGIOService) GenerateImage(ctx context.Context, req GenerateRequest) (*ImageResponse, error) {
	logger := log.GetReqLogger(ctx)
	logger.Printf("[SVGIO] Starting generation request...")

	upReq := svgioGenerateReq{
		Prompt:         req.Prompt,
		NegativePrompt: &req.NegativePrompt,
		Style:          &req.Style,
	}

	if req.NegativePrompt == "" {
		defaultNegativePrompt := "NULL"
		upReq.NegativePrompt = &defaultNegativePrompt
	}

	if req.Style == "" {
		defaultStyle := "FLAT_VECTOR"
		upReq.Style = &defaultStyle
	}

	body, err := json.Marshal(upReq)
	if err != nil {
		logger.Printf("[SVGIO] Failed to marshal request: %v", err)
		return nil, err
	}

	apiURL := s.config.BaseURL + s.config.Endpoints.Generate
	logger.Printf("[SVGIO] Sending request to %s with payload size: %d bytes", apiURL, len(body))

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(body))
	if err != nil {
		logger.Printf("[SVGIO] Failed to create request: %v", err)
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+s.getAPIKey())

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		logger.Printf("[SVGIO] HTTP request failed: %v", err)
		return nil, err
	}
	defer resp.Body.Close()

	logger.Printf("[SVGIO] Received response with status: %s", resp.Status)

	if resp.StatusCode >= 300 {
		var raw interface{}
		_ = json.NewDecoder(resp.Body).Decode(&raw)
		logger.Printf("[SVGIO] Error response body: %+v", raw)
		return nil, errors.New("upstream status: " + resp.Status)
	}

	var upResp svgioGenerateResp
	if err := json.NewDecoder(resp.Body).Decode(&upResp); err != nil {
		logger.Printf("[SVGIO] Failed to decode response: %v", err)
		return nil, err
	}

	if !upResp.Success || len(upResp.Data) == 0 {
		logger.Printf("[SVGIO] Invalid response: success=%v, data_count=%d", upResp.Success, len(upResp.Data))
		return nil, errors.New("upstream no data")
	}

	it := upResp.Data[0]
	logger.Printf("[SVGIO] Successfully parsed response - ID: %s, SVG: %s, PNG: %s", it.ID, it.SVGURL, it.PNGURL)

	createdAt, _ := time.Parse(time.RFC3339, it.CreatedAt)
	return &ImageResponse{
		ID:             it.ID,
		Prompt:         it.Prompt,
		NegativePrompt: it.NegativePrompt,
		Style:          it.Style,
		SVGURL:         it.SVGURL,
		PNGURL:         it.PNGURL,
		Width:          it.Width,
		Height:         it.Height,
		CreatedAt:      createdAt,
		Provider:       ProviderSVGIO,
	}, nil
}

// BeautifyImage is not supported by SVGIO provider.
func (s *SVGIOService) BeautifyImage(ctx context.Context, req BeautifyImageRequest) (*BeautifyImageResponse, error) {
	return nil, errors.New("BeautifyImage is not supported by SVGIO provider")
}

// ChangeCharacterStyle is not supported by SVGIO provider.
func (s *SVGIOService) ChangeCharacterStyle(ctx context.Context, req CharacterStyleChangeRequest) (*CharacterStyleChangeResponse, error) {
	return nil, errors.New("ChangeCharacterStyle is not supported by SVGIO provider")
}

// getAPIKey gets the API key from environment or configuration.
func (s *SVGIOService) getAPIKey() string {
	// Get API key from environment variable
	// In production, consider using a more secure method like AWS Secrets Manager
	return os.Getenv("SVGIO_API_KEY")
}
