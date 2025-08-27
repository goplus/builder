package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/goplus/builder/spx-backend/internal/log"
)

// ImageRecommendParams represents parameters for image recommendation.
type ImageRecommendParams struct {
	Text string `json:"text"`
	TopK int    `json:"top_k,omitempty"`
}

// Validate validates the image recommendation parameters.
func (p *ImageRecommendParams) Validate() (bool, string) {
	if len(p.Text) < 1 {
		return false, "text is required"
	}
	if p.TopK == 0 {
		p.TopK = 3 // Default to top 8 results
	}
	if p.TopK < 1 || p.TopK > 50 {
		return false, "top_k must be between 1 and 50"
	}
	return true, ""
}

// ImageRecommendResult represents the result of image recommendation.
type ImageRecommendResult struct {
	Query        string                   `json:"query"`
	ResultsCount int                      `json:"results_count"`
	Results      []RecommendedImageResult `json:"results"`
}

// RecommendedImageResult represents a single recommended image result.
type RecommendedImageResult struct {
	ID         int64   `json:"id"`
	URL        string  `json:"url"`
	Similarity float64 `json:"similarity"`
	Rank       int     `json:"rank"`
}

// AlgorithmSearchRequest represents the request to spx-algorithm service.
type AlgorithmSearchRequest struct {
	Text string `json:"text"`
	TopK int    `json:"top_k"`
	Threshold float64 `json:"threshold"`
}

// AlgorithmSearchResponse represents the response from spx-algorithm service.
type AlgorithmSearchResponse struct {
	Query        string                 `json:"query"`
	ResultsCount int                    `json:"results_count"`
	Results      []AlgorithmImageResult `json:"results"`
}

// AlgorithmImageResult represents a single image result from algorithm service.
type AlgorithmImageResult struct {
	ImagePath  string  `json:"image_path"`
	Similarity float64 `json:"similarity"`
	Rank       int     `json:"rank"`
}

// RecommendImages recommends similar images based on text prompt.
func (ctrl *Controller) RecommendImages(ctx context.Context, params *ImageRecommendParams) (*ImageRecommendResult, error) {
	logger := log.GetReqLogger(ctx)
	logger.Printf("RecommendImages request - text: %q, top_k: %d", params.Text, params.TopK)

	// Step 1: Call spx-algorithm service for semantic search
	algorithmResp, err := ctrl.callAlgorithmService(ctx, params.Text, params.TopK)
	if err != nil {
		logger.Printf("Algorithm service call failed: %v", err)
		return nil, fmt.Errorf("algorithm service call failed: %w", err)
	}

	// Step 2: Convert algorithm results to response format and fetch resource details
	results := make([]RecommendedImageResult, 0, len(algorithmResp.Results))

	for _, algResult := range algorithmResp.Results {
		result := RecommendedImageResult{
			ID:         0,
			URL:        algResult.ImagePath,
			Similarity: algResult.Similarity,
			Rank:       algResult.Rank,
		}

		results = append(results, result)
	}

	logger.Printf("Recommendation completed - found %d results", len(results))

	return &ImageRecommendResult{
		Query:        params.Text,
		ResultsCount: len(results),
		Results:      results,
	}, nil
}

// callAlgorithmService calls the spx-algorithm service for semantic search.
func (ctrl *Controller) callAlgorithmService(ctx context.Context, text string, topK int) (*AlgorithmSearchResponse, error) {
	algorithmURL := ctrl.getAlgorithmServiceURL() + "/api/search/resource"

	reqData := AlgorithmSearchRequest{
		Text: text,
		TopK: topK,
		Threshold: 0.27,
	}

	reqBody, err := json.Marshal(reqData)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", algorithmURL, bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("algorithm service returned status: %d", resp.StatusCode)
	}

	var algorithmResp AlgorithmSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&algorithmResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &algorithmResp, nil
}

// getAlgorithmServiceURL returns the algorithm service URL from configuration.
func (ctrl *Controller) getAlgorithmServiceURL() string {
	// TODO: Get from config when available
	// For now, use localhost default
	return "http://100.100.35.128:5000"
}
