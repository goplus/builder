package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/svggen"
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
	ImagePath  string  `json:"image_path"`
	Similarity float64 `json:"similarity"`
	Rank       int     `json:"rank"`
	Source     string  `json:"source"` // "search" for found images, "generated" for AI generated
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

	// Step 1: Call spx-algorithm service for semantic search with higher limit to find qualified images
	algorithmResp, err := ctrl.callAlgorithmService(ctx, params.Text, params.TopK) // Request more to account for filtering
	if err != nil {
		logger.Printf("Algorithm service call failed: %v", err)
		return nil, fmt.Errorf("algorithm service call failed: %w", err)
	}

	// Step 2: Query database to get KodoURLs for found images
	foundResults := make([]RecommendedImageResult, 0, params.TopK)
	for _, algResult := range algorithmResp.Results {
		var aiResource struct {
			ID  int64  `json:"id"`
			URL string `json:"url"`
		}
		
		//err := ctrl.db.Table("aiResource").Select("id, url").Where("url = ? AND deleted_at IS NULL", algResult.ImagePath).First(&aiResource).Error
		//if err == nil {
			// Found matching resource in database
		foundResults = append(foundResults, RecommendedImageResult{
			ID:         aiResource.ID,
			ImagePath:  algResult.ImagePath,
			Similarity: algResult.Similarity,
			Rank:       algResult.Rank,
			Source:     "search",
		})
		
		if len(foundResults) >= params.TopK {
			break // We have enough results
		}
		// } else {
		// 	logger.Printf("Image not found in database: %s", algResult.ImagePath)
		// }
	}

	logger.Printf("Found %d matching images in database", len(foundResults))

	// Step 3: Generate AI SVGs if we don't have enough results
	if len(foundResults) < params.TopK {
		needed := params.TopK - len(foundResults)
		logger.Printf("Need to generate %d AI SVG images", needed)
		
		generatedResults, err := ctrl.generateAISVGs(ctx, params.Text, needed, len(foundResults))
		if err != nil {
			logger.Printf("Failed to generate AI SVGs: %v", err)
			// Don't fail the entire request, just return what we found
		} else {
			foundResults = append(foundResults, generatedResults...)
		}
	}

	// Step 4: Update ranks to be sequential
	for i := range foundResults {
		foundResults[i].Rank = i + 1
	}

	logger.Printf("Recommendation completed - total %d results (%d from search, %d generated)", 
		len(foundResults), 
		countBySource(foundResults, "search"), 
		countBySource(foundResults, "generated"))

	return &ImageRecommendResult{
		Query:        params.Text,
		ResultsCount: len(foundResults),
		Results:      foundResults,
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

// generateAISVGs generates AI SVG images concurrently to fill the gap when not enough images are found.
func (ctrl *Controller) generateAISVGs(ctx context.Context, text string, count int, startRank int) ([]RecommendedImageResult, error) {
	logger := log.GetReqLogger(ctx)
	if count <= 0 {
		return nil, nil
	}

	// Channel to collect results
	type generateResult struct {
		result RecommendedImageResult
		err    error
		index  int
	}
	resultChan := make(chan generateResult, count)

	// Start concurrent generation
	for i := range count {
		go func(index int) {
			// Create SVG generation parameters
			params := &GenerateSVGParams{
				Prompt:   text,
				Provider: svggen.ProviderSVGIO, // Use default provider
				Theme:    ThemeNone,
			}

			// Validate parameters
			if valid, errMsg := params.Validate(); !valid {
				resultChan <- generateResult{
					err:   fmt.Errorf("invalid SVG generation params: %s", errMsg),
					index: index,
				}
				return
			}

			// Generate SVG
			svgResp, err := ctrl.GenerateSVG(ctx, params)
			if err != nil {
				logger.Printf("Failed to generate SVG %d: %v", index+1, err)
				resultChan <- generateResult{
					err:   err,
					index: index,
				}
				return
			}

			if svgResp.KodoURL == "" {
				logger.Printf("Generated SVG %d has no KodoURL", index+1)
				resultChan <- generateResult{
					err:   fmt.Errorf("generated SVG has no KodoURL"),
					index: index,
				}
				return
			}

			// Success
			resultChan <- generateResult{
				result: RecommendedImageResult{
					ID:         svgResp.AIResourceID,
					ImagePath:  svgResp.KodoURL,
					Similarity: 0.8 - float64(index)*0.05, // Assign decreasing similarity scores
					Rank:       startRank + index + 1,
					Source:     "generated",
				},
				index: index,
			}

			logger.Printf("Generated AI SVG %d: %s", index+1, svgResp.KodoURL)
		}(i)
	}

	// Collect results
	results := make([]RecommendedImageResult, 0, count)
	var successCount int
	for range count {
		select {
		case result := <-resultChan:
			if result.err != nil {
				logger.Printf("Generation %d failed: %v", result.index+1, result.err)
			} else {
				results = append(results, result.result)
				successCount++
			}
		case <-ctx.Done():
			logger.Printf("Context cancelled during AI generation")
			return results, ctx.Err()
		}
	}

	logger.Printf("AI generation completed: %d/%d successful", successCount, count)
	return results, nil
}

// countBySource counts results by their source type.
func countBySource(results []RecommendedImageResult, source string) int {
	count := 0
	for _, result := range results {
		if result.Source == source {
			count++
		}
	}
	return count
}

// getAlgorithmServiceURL returns the algorithm service URL from configuration.
func (ctrl *Controller) getAlgorithmServiceURL() string {
	// TODO: Get from config when available
	// For now, use localhost default
	return "http://100.100.35.128:5000"
}
