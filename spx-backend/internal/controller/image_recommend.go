package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/svggen"
)

// ImageRecommendParams represents parameters for image recommendation.
type ImageRecommendParams struct {
	Text  string    `json:"prompt"`
	TopK  int       `json:"top_k,omitempty"`
	Theme ThemeType `json:"theme,omitempty"`
}

// Validate validates the image recommendation parameters.
func (p *ImageRecommendParams) Validate() (bool, string) {
	if len(p.Text) < 1 {
		return false, "text is required"
	}
	if p.TopK == 0 {
		p.TopK = 4 // Default to top 4 results
	}
	if p.TopK < 1 || p.TopK > 50 {
		return false, "top_k must be between 1 and 50"
	}
	
	// Validate theme
	if !IsValidTheme(p.Theme) {
		return false, "invalid theme type"
	}
	
	return true, ""
}

// GetProviderForTheme returns the appropriate provider for the given theme.
func (p *ImageRecommendParams) GetProviderForTheme() svggen.Provider {
	if p.Theme != ThemeNone {
		return GetThemeRecommendedProvider(p.Theme)
	}
	return svggen.ProviderOpenAI // Default fallback
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
	Text      string  `json:"text"`
	TopK      int     `json:"top_k"`
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

// RecommendImages recommends similar images based on text prompt using dual-path search strategy.
func (ctrl *Controller) RecommendImages(ctx context.Context, params *ImageRecommendParams) (*ImageRecommendResult, error) {
	logger := log.GetReqLogger(ctx)
	
	// Get provider based on theme
	provider := params.GetProviderForTheme()
	logger.Printf("RecommendImages request - text: %q, theme: %s, provider: %s, top_k: %d", params.Text, params.Theme, provider, params.TopK)

	if params.Theme != ThemeNone {
		logger.Printf("Using theme-recommended provider: %s for theme: %s", provider, params.Theme)
	}

	var foundResults []RecommendedImageResult
	var err error

	if params.Theme != ThemeNone {
		// Use dual-path search strategy for theme-based requests
		foundResults, err = ctrl.dualPathSearch(ctx, params)
	} else {
		// Use single semantic search for non-themed requests
		foundResults, err = ctrl.singleSemanticSearch(ctx, params)
	}

	if err != nil {
		logger.Printf("Search failed: %v", err)
		return nil, fmt.Errorf("search failed: %w", err)
	}

	logger.Printf("Found %d matching images from search", len(foundResults))

	// Generate AI SVGs if we don't have enough results
	if len(foundResults) < params.TopK {
		needed := params.TopK - len(foundResults)
		logger.Printf("Need to generate %d AI SVG images", needed)

		// Get optimized prompt for AI generation
		var aiPrompt string
		if params.Theme != ThemeNone {
			aiPrompt = OptimizePromptWithAnalysis(params.Text, params.Theme)
		} else {
			aiPrompt = params.Text
		}

		generatedResults, err := ctrl.generateAISVGs(ctx, aiPrompt, provider, needed, len(foundResults))
		if err != nil {
			logger.Printf("Failed to generate AI SVGs: %v", err)
			// Don't fail the entire request, just return what we found
		} else {
			foundResults = append(foundResults, generatedResults...)
		}
	}

	// Update ranks to be sequential
	for i := range foundResults {
		foundResults[i].Rank = i + 1
	}

	logger.Printf("Recommendation completed - total %d results (%d from search, %d generated)",
		len(foundResults),
		countBySource(foundResults, "search"),
		countBySource(foundResults, "generated"))

	finalQuery := params.Text
	if params.Theme != ThemeNone {
		finalQuery = OptimizePromptWithAnalysis(params.Text, params.Theme)
	}

	return &ImageRecommendResult{
		Query:        finalQuery,
		ResultsCount: len(foundResults),
		Results:      foundResults,
	}, nil
}

// callAlgorithmService calls the spx-algorithm service for semantic search.
func (ctrl *Controller) callAlgorithmService(ctx context.Context, text string, topK int) (*AlgorithmSearchResponse, error) {
	algorithmURL := ctrl.getAlgorithmServiceURL() + "/api/search/resource"

	reqData := AlgorithmSearchRequest{
		Text:      text,
		TopK:      topK,
		Threshold: 0.2,
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
// The text parameter should already have theme enhancement applied.
func (ctrl *Controller) generateAISVGs(ctx context.Context, finalPrompt string, provider svggen.Provider, count int, startRank int) ([]RecommendedImageResult, error) {
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
			// Create SVG generation parameters - text already has theme applied, so use ThemeNone to avoid double application
			params := &GenerateSVGParams{
				Prompt:   finalPrompt,
				Provider: provider,
				Theme:    ThemeNone, // Use ThemeNone since text already has theme enhancement applied
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

// dualPathSearch implements the dual-path search strategy for themed requests
func (ctrl *Controller) dualPathSearch(ctx context.Context, params *ImageRecommendParams) ([]RecommendedImageResult, error) {
	logger := log.GetReqLogger(ctx)
	
	// Calculate split for dual search (70% semantic, 30% theme-optimized)
	semanticCount := params.TopK * 7 / 10
	themeCount := params.TopK - semanticCount
	
	logger.Printf("Dual-path search: %d semantic + %d theme-optimized = %d total", semanticCount, themeCount, params.TopK)
	
	// Channel to collect search results
	type searchResult struct {
		results []RecommendedImageResult
		source  string
		err     error
	}
	resultChan := make(chan searchResult, 2)
	
	// Start semantic search concurrently
	go func() {
		semanticPrompt := GetOptimizedPromptForSearch(params.Text, params.Theme, "semantic")
		logger.Printf("Semantic search prompt: %q", semanticPrompt)
		
		algorithmResp, err := ctrl.callAlgorithmService(ctx, semanticPrompt, semanticCount)
		if err != nil {
			resultChan <- searchResult{err: err, source: "semantic"}
			return
		}
		
		results := ctrl.processAlgorithmResults(algorithmResp.Results, "semantic_search")
		resultChan <- searchResult{results: results, source: "semantic"}
	}()
	
	// Start theme search concurrently
	go func() {
		themePrompt := GetOptimizedPromptForSearch(params.Text, params.Theme, "theme")
		logger.Printf("Theme search prompt: %q", themePrompt)
		
		algorithmResp, err := ctrl.callAlgorithmService(ctx, themePrompt, themeCount)
		if err != nil {
			resultChan <- searchResult{err: err, source: "theme"}
			return
		}
		
		results := ctrl.processAlgorithmResults(algorithmResp.Results, "theme_search")
		resultChan <- searchResult{results: results, source: "theme"}
	}()
	
	// Collect results from both searches
	var semanticResults, themeResults []RecommendedImageResult
	var searchErrors []error
	
	for i := 0; i < 2; i++ {
		select {
		case result := <-resultChan:
			if result.err != nil {
				logger.Printf("%s search failed: %v", result.source, result.err)
				searchErrors = append(searchErrors, result.err)
			} else {
				if result.source == "semantic" {
					semanticResults = result.results
					logger.Printf("Semantic search completed: %d results", len(semanticResults))
				} else {
					themeResults = result.results
					logger.Printf("Theme search completed: %d results", len(themeResults))
				}
			}
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}
	
	// If both searches failed, return error
	if len(searchErrors) == 2 {
		return nil, fmt.Errorf("both searches failed: semantic=%v, theme=%v", searchErrors[0], searchErrors[1])
	}
	
	// Fuse and score results
	fusedResults := ctrl.fuseSearchResults(semanticResults, themeResults, params.Theme)
	
	// Limit to requested top_k
	if len(fusedResults) > params.TopK {
		fusedResults = fusedResults[:params.TopK]
	}
	
	return fusedResults, nil
}

// singleSemanticSearch implements single semantic search for non-themed requests
func (ctrl *Controller) singleSemanticSearch(ctx context.Context, params *ImageRecommendParams) ([]RecommendedImageResult, error) {
	logger := log.GetReqLogger(ctx)
	
	logger.Printf("Single semantic search for prompt: %q", params.Text)
	
	algorithmResp, err := ctrl.callAlgorithmService(ctx, params.Text, params.TopK)
	if err != nil {
		return nil, fmt.Errorf("algorithm service call failed: %w", err)
	}
	
	results := ctrl.processAlgorithmResults(algorithmResp.Results, "search")
	
	logger.Printf("Semantic search completed: %d results", len(results))
	return results, nil
}

// processAlgorithmResults processes algorithm service results into RecommendedImageResult format
func (ctrl *Controller) processAlgorithmResults(algResults []AlgorithmImageResult, source string) []RecommendedImageResult {
	results := make([]RecommendedImageResult, 0, len(algResults))
	
	for _, algResult := range algResults {
		var aiResource struct {
			ID  int64  `json:"id"`
			URL string `json:"url"`
		}
		
		// TODO: Enable database lookup when ready
		// err := ctrl.db.Table("aiResource").Select("id, url").Where("url = ? AND deleted_at IS NULL", algResult.ImagePath).First(&aiResource).Error
		// if err == nil {
			// Found matching resource in database
			results = append(results, RecommendedImageResult{
				ID:         aiResource.ID,
				ImagePath:  algResult.ImagePath,
				Similarity: algResult.Similarity,
				Rank:       algResult.Rank,
				Source:     source,
			})
		// } else {
		// 	logger.Printf("Image not found in database: %s", algResult.ImagePath)
		// }
	}
	
	return results
}

// fuseSearchResults fuses and re-scores results from semantic and theme searches
func (ctrl *Controller) fuseSearchResults(semanticResults, themeResults []RecommendedImageResult, theme ThemeType) []RecommendedImageResult {
	logger := log.GetReqLogger(context.Background())
	
	// Combine all results
	allResults := make([]RecommendedImageResult, 0, len(semanticResults)+len(themeResults))
	
	// Add semantic results
	for _, result := range semanticResults {
		allResults = append(allResults, result)
	}
	
	// Add theme results (with deduplication)
	for _, result := range themeResults {
		if !ctrl.isDuplicateResult(result, allResults) {
			allResults = append(allResults, result)
		} else {
			logger.Printf("Deduplicated theme result: %s", result.ImagePath)
		}
	}
	
	// Re-score all results with theme relevance
	for i := range allResults {
		semanticScore := allResults[i].Similarity
		
		// Calculate theme relevance score (simplified - in production this could use ML)
		themeScore := ctrl.calculateThemeRelevance(allResults[i].ImagePath, theme)
		
		// Weight combination: 70% semantic + 30% theme
		allResults[i].Similarity = semanticScore*0.7 + themeScore*0.3
		
		logger.Printf("Result %s: semantic=%.3f, theme=%.3f, final=%.3f", 
			allResults[i].ImagePath, semanticScore, themeScore, allResults[i].Similarity)
	}
	
	// Sort by final similarity score
	for i := 0; i < len(allResults)-1; i++ {
		for j := i + 1; j < len(allResults); j++ {
			if allResults[i].Similarity < allResults[j].Similarity {
				allResults[i], allResults[j] = allResults[j], allResults[i]
			}
		}
	}
	
	logger.Printf("Fused %d semantic + %d theme results into %d total results", 
		len(semanticResults), len(themeResults), len(allResults))
	
	return allResults
}

// isDuplicateResult checks if a result is already in the collection
func (ctrl *Controller) isDuplicateResult(result RecommendedImageResult, existing []RecommendedImageResult) bool {
	for _, existingResult := range existing {
		if result.ImagePath == existingResult.ImagePath {
			return true
		}
	}
	return false
}


// TODO 这里计划使用CLIP模型来实现
// calculateThemeRelevance calculates theme relevance score for an image
func (ctrl *Controller) calculateThemeRelevance(imagePath string, theme ThemeType) float64 {
	// Simplified theme relevance calculation
	// In production, this could use ML models or metadata analysis
	
	// For now, assign scores based on theme source
	switch theme {
	case ThemeCartoon:
		// Higher scores for images likely to be cartoon-style
		if strings.Contains(imagePath, "cartoon") || strings.Contains(imagePath, "cute") {
			return 0.9
		}
		return 0.7
	case ThemeRealistic:
		if strings.Contains(imagePath, "realistic") || strings.Contains(imagePath, "photo") {
			return 0.9
		}
		return 0.6
	case ThemeMinimal:
		if strings.Contains(imagePath, "minimal") || strings.Contains(imagePath, "simple") {
			return 0.9
		}
		return 0.7
	default:
		return 0.8 // Default theme relevance
	}
}
