package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/goplus/builder/spx-backend/internal/copilot"
	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/svggen"
)

// ImageRecommendParams represents parameters for image recommendation.
type ImageRecommendParams struct {
	Text  string    `json:"prompt"`
	TopK  int       `json:"top_k,omitempty"`
	Theme ThemeType `json:"theme,omitempty"`
}

// PromptAnalysisContext holds cached prompt analysis and optimized prompts for a request.
// This prevents multiple AI calls for the same prompt analysis within a single request.
type PromptAnalysisContext struct {
	OriginalPrompt    string          // Original user prompt
	Theme             ThemeType       // Theme being applied
	Analysis          PromptAnalysis  // Cached AI analysis result (only computed once)
	OptimizedPrompt   string          // Fully optimized prompt for AI generation
	SemanticPrompt    string          // Optimized prompt for semantic search
	ThemePrompt       string          // Optimized prompt for theme search
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

// NewPromptAnalysisContext creates a new prompt analysis context with cached optimization results.
// This performs AI analysis only once and caches all optimized prompt variations.
func NewPromptAnalysisContext(ctx context.Context, originalPrompt string, theme ThemeType, copilotClient *copilot.Copilot) *PromptAnalysisContext {
	logger := log.GetReqLogger(ctx)
	
	analysisCtx := &PromptAnalysisContext{
		OriginalPrompt: originalPrompt,
		Theme:          theme,
	}
	
	// If no theme, use original prompt for all variations
	if theme == ThemeNone {
		analysisCtx.OptimizedPrompt = originalPrompt
		analysisCtx.SemanticPrompt = originalPrompt
		analysisCtx.ThemePrompt = originalPrompt
		// Analysis is not needed for ThemeNone, but initialize with defaults
		analysisCtx.Analysis = PromptAnalysis{
			Type:       "default",
			Emotion:    "neutral", 
			Complexity: "simple",
			Keywords:   extractKeywords(originalPrompt),
		}
		return analysisCtx
	}
	
	// Step 1: Perform AI analysis only once (this is the expensive operation)
	logger.Printf("Performing prompt analysis for: %q", originalPrompt)
	analysisCtx.Analysis = AnalyzePromptType(ctx, originalPrompt, copilotClient)
	logger.Printf("Analysis completed - Type: %s, Emotion: %s, Complexity: %s", 
		analysisCtx.Analysis.Type, analysisCtx.Analysis.Emotion, analysisCtx.Analysis.Complexity)
	
	// Step 2: Build all prompt variations using cached analysis (no additional AI calls)
	analysisCtx.OptimizedPrompt = buildOptimizedPromptFromAnalysis(originalPrompt, theme, analysisCtx.Analysis)
	analysisCtx.SemanticPrompt = buildSemanticPrompt(originalPrompt, theme)
	analysisCtx.ThemePrompt = analysisCtx.OptimizedPrompt // Use fully optimized for theme search
	
	logger.Printf("Prompt optimization completed - Original: %q, Optimized: %q", 
		originalPrompt, analysisCtx.OptimizedPrompt)
	
	return analysisCtx
}

// buildOptimizedPromptFromAnalysis builds a fully optimized prompt using cached analysis.
// This replaces OptimizePromptWithAnalysis but uses pre-computed analysis instead of making AI calls.
func buildOptimizedPromptFromAnalysis(userPrompt string, theme ThemeType, analysis PromptAnalysis) string {
	if theme == ThemeNone {
		return userPrompt
	}
	
	// Get theme enhancement
	themePrompt := GetThemePromptEnhancement(theme)
	
	// Get quality enhancement based on cached complexity
	qualityPrompt := QualityPrompts[analysis.Complexity]
	
	// Get style enhancement based on cached type
	stylePrompt := StylePrompts[analysis.Type]
	
	// Get technical requirements
	technicalPrompt := TechnicalPrompts[theme]
	
	// Combine all prompts using the same logic as original
	return buildNaturalPrompt(userPrompt, themePrompt, qualityPrompt, stylePrompt, technicalPrompt)
}

// buildSemanticPrompt builds a lighter prompt variation optimized for semantic search.
// This maintains semantic relevance while adding minimal theme enhancement.
func buildSemanticPrompt(userPrompt string, theme ThemeType) string {
	if theme == ThemeNone {
		return userPrompt
	}
	// Light theme enhancement for semantic search to maintain relevance
	themePrompt := GetThemePromptEnhancement(theme)
	return fmt.Sprintf("%s，%s", userPrompt, themePrompt)
}

// ImageRecommendResult represents the result of image recommendation.
type ImageRecommendResult struct {
	QueryID      string                   `json:"query_id"`
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

// generateQueryID generates a unique query ID for tracking recommendations
func generateQueryID() string {
	return uuid.New().String()
}

// ImageFeedbackParams represents parameters for image recommendation feedback.
type ImageFeedbackParams struct {
	QueryID    string `json:"query_id"`
	ChosenPic  int64  `json:"chosen_pic"`
}

// Validate validates the image feedback parameters.
func (p *ImageFeedbackParams) Validate() (bool, string) {
	if p.QueryID == "" {
		return false, "query_id is required"
	}
	if p.ChosenPic <= 0 {
		return false, "chosen_pic must be greater than 0"
	}
	return true, ""
}

// AlgorithmFeedbackRequest represents the request to spx-algorithm feedback service.
type AlgorithmFeedbackRequest struct {
	QueryID          string  `json:"query_id"`
	Query            string  `json:"query"`
	RecommendedPics  []int64 `json:"recommended_pics"`
	ChosenPic        int64   `json:"chosen_pic"`
}

// RecommendationCache stores recommendation results for feedback tracking
type RecommendationCache struct {
	QueryID         string
	Query           string
	RecommendedPics []int64
	Timestamp       time.Time
}

// Global cache for storing recommendation results (in production, consider using Redis)
var (
	recommendationCache = make(map[string]*RecommendationCache)
	cacheMutex         = sync.RWMutex{}
	cacheExpiry        = 24 * time.Hour // Cache expires after 24 hours
)

// RecommendImages recommends similar images based on text prompt using dual-path search strategy.
// PERFORMANCE OPTIMIZATION: This method now performs AI prompt analysis only once per request
// and reuses the cached results throughout the entire recommendation process.
func (ctrl *Controller) RecommendImages(ctx context.Context, params *ImageRecommendParams) (*ImageRecommendResult, error) {
	logger := log.GetReqLogger(ctx)
	
	// Get provider based on theme
	provider := params.GetProviderForTheme()
	logger.Printf("RecommendImages request - text: %q, theme: %s, provider: %s, top_k: %d", params.Text, params.Theme, provider, params.TopK)

	if params.Theme != ThemeNone {
		logger.Printf("Using theme-recommended provider: %s for theme: %s", provider, params.Theme)
	}

	// OPTIMIZATION: Create prompt analysis context once at the beginning
	// This performs AI analysis only once and caches all optimized prompt variations
	promptCtx := NewPromptAnalysisContext(ctx, params.Text, params.Theme, ctrl.copilot)

	var foundResults []RecommendedImageResult
	var err error

	if params.Theme != ThemeNone {
		// Use dual-path search strategy for theme-based requests
		foundResults, err = ctrl.dualPathSearchOptimized(ctx, params, promptCtx)
	} else {
		// Use single semantic search for non-themed requests
		foundResults, err = ctrl.singleSemanticSearchOptimized(ctx, params, promptCtx)
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

		// OPTIMIZATION: Use cached optimized prompt instead of calling OptimizePromptWithAnalysis again
		generatedResults, err := ctrl.generateAISVGsOptimized(ctx, promptCtx.OptimizedPrompt, provider, needed, len(foundResults))
		if err != nil {
			logger.Printf("Failed to generate AI SVGs: %v", err)
			// Don't fail the entire request, just return what we found
		} else {
			foundResults = append(foundResults, generatedResults...)
		}
	}

	// 
	/*
	TODO 要加上调用算法服务的/v1/feedback/submit接口，来传给他用户反馈的数据, 需要的数据如下:
	POST /v1/feedback/submit
	Content-Type: application/json

	{
	"query_id": 123,
	"query": "dog running in park",
	"recommended_pics": [1001, 1002, 1003, 1004],
	"chosen_pic": 1002
	}
	*/


	// Update ranks to be sequential
	for i := range foundResults {
		foundResults[i].Rank = i + 1
	}

	logger.Printf("Recommendation completed - total %d results (%d from search, %d generated)",
		len(foundResults),
		countBySource(foundResults, "search"),
		countBySource(foundResults, "generated"))

	// Generate unique query ID for tracking
	queryID := generateQueryID()
	logger.Printf("Generated query ID: %s for query: %q", queryID, promptCtx.OptimizedPrompt)

	// Extract recommended pic IDs for feedback tracking
	recommendedPics := make([]int64, len(foundResults))
	for i, result := range foundResults {
		recommendedPics[i] = result.ID
	}

	// Cache recommendation result for feedback tracking
	cacheRecommendationResult(queryID, promptCtx.OptimizedPrompt, recommendedPics)

	// OPTIMIZATION: Use cached optimized prompt for final query instead of calling OptimizePromptWithAnalysis again
	return &ImageRecommendResult{
		QueryID:      queryID,
		Query:        promptCtx.OptimizedPrompt,
		ResultsCount: len(foundResults),
		Results:      foundResults,
	}, nil
}

// callAlgorithmService calls the spx-algorithm service for semantic search.
func (ctrl *Controller) callAlgorithmService(ctx context.Context, text string, topK int) (*AlgorithmSearchResponse, error) {
	algorithmURL := ctrl.getAlgorithmServiceURL() + "/v1/resource/search"

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


// generateAISVGsOptimized generates AI SVG images using pre-optimized prompt.
// PERFORMANCE OPTIMIZATION: Uses cached optimized prompt instead of calling OptimizePromptWithAnalysis.
// The finalPrompt parameter should already have all theme and analysis enhancements applied.
func (ctrl *Controller) generateAISVGsOptimized(ctx context.Context, finalPrompt string, provider svggen.Provider, count int, startRank int) ([]RecommendedImageResult, error) {
	logger := log.GetReqLogger(ctx)
	if count <= 0 {
		return nil, nil
	}

	logger.Printf("Generating %d AI SVGs with optimized prompt: %q", count, finalPrompt)

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
			// Create SVG generation parameters - prompt already optimized, so use ThemeNone to avoid double application
			params := &GenerateSVGParams{
				Prompt:   finalPrompt,
				Provider: provider,
				Theme:    ThemeNone, // Use ThemeNone since prompt already has all enhancements applied
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
	return "http://localhost:5000"
}

// cacheRecommendationResult stores recommendation result for feedback tracking
func cacheRecommendationResult(queryID, query string, recommendedPics []int64) {
	cacheMutex.Lock()
	defer cacheMutex.Unlock()
	
	recommendationCache[queryID] = &RecommendationCache{
		QueryID:         queryID,
		Query:           query,
		RecommendedPics: recommendedPics,
		Timestamp:       time.Now(),
	}
}

// getCachedRecommendation retrieves cached recommendation result by query ID
func getCachedRecommendation(queryID string) (*RecommendationCache, bool) {
	cacheMutex.RLock()
	defer cacheMutex.RUnlock()
	
	cached, exists := recommendationCache[queryID]
	if !exists {
		return nil, false
	}
	
	// Check if cache has expired
	if time.Since(cached.Timestamp) > cacheExpiry {
		// Remove expired entry (cleanup)
		delete(recommendationCache, queryID)
		return nil, false
	}
	
	return cached, true
}

// cleanupExpiredCache removes expired cache entries (should be called periodically)
func cleanupExpiredCache() {
	cacheMutex.Lock()
	defer cacheMutex.Unlock()
	
	now := time.Now()
	for queryID, cached := range recommendationCache {
		if now.Sub(cached.Timestamp) > cacheExpiry {
			delete(recommendationCache, queryID)
		}
	}
}


// dualPathSearchOptimized implements optimized dual-path search using cached prompt analysis.
// PERFORMANCE OPTIMIZATION: Uses pre-computed prompts from PromptAnalysisContext instead of making AI calls.
func (ctrl *Controller) dualPathSearchOptimized(ctx context.Context, params *ImageRecommendParams, promptCtx *PromptAnalysisContext) ([]RecommendedImageResult, error) {
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
	
	// Start semantic search concurrently using cached prompt
	go func() {
		semanticPrompt := promptCtx.SemanticPrompt
		logger.Printf("Semantic search prompt: %q", semanticPrompt)
		
		algorithmResp, err := ctrl.callAlgorithmService(ctx, semanticPrompt, semanticCount)
		if err != nil {
			resultChan <- searchResult{err: err, source: "semantic"}
			return
		}
		
		results := ctrl.processAlgorithmResults(algorithmResp.Results, "semantic_search")
		resultChan <- searchResult{results: results, source: "semantic"}
	}()
	
	// Start theme search concurrently using cached prompt
	go func() {
		themePrompt := promptCtx.ThemePrompt
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


// singleSemanticSearchOptimized implements optimized single semantic search using cached prompt analysis.
// PERFORMANCE OPTIMIZATION: Uses pre-computed prompt from PromptAnalysisContext.
func (ctrl *Controller) singleSemanticSearchOptimized(ctx context.Context, params *ImageRecommendParams, promptCtx *PromptAnalysisContext) ([]RecommendedImageResult, error) {
	logger := log.GetReqLogger(ctx)
	
	// Use the cached semantic prompt (for ThemeNone, this will be the original prompt)
	searchPrompt := promptCtx.SemanticPrompt
	logger.Printf("Single semantic search for prompt: %q", searchPrompt)
	
	algorithmResp, err := ctrl.callAlgorithmService(ctx, searchPrompt, params.TopK)
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

// SubmitImageFeedback submits user feedback for image recommendations to algorithm service
func (ctrl *Controller) SubmitImageFeedback(ctx context.Context, params *ImageFeedbackParams) error {
	logger := log.GetReqLogger(ctx)
	logger.Printf("Submitting image feedback - QueryID: %s, ChosenPic: %d", params.QueryID, params.ChosenPic)
	
	// Retrieve cached recommendation result
	cached, exists := getCachedRecommendation(params.QueryID)
	if !exists {
		logger.Printf("Cached recommendation not found for QueryID: %s", params.QueryID)
		return fmt.Errorf("recommendation not found for query_id: %s", params.QueryID)
	}
	
	// Verify chosen pic is in the recommended list
	chosenPicFound := false
	for _, picID := range cached.RecommendedPics {
		if picID == params.ChosenPic {
			chosenPicFound = true
			break
		}
	}
	
	if !chosenPicFound {
		logger.Printf("Chosen pic %d not found in recommended pics %v", params.ChosenPic, cached.RecommendedPics)
		return fmt.Errorf("chosen_pic %d is not in the recommended pictures list", params.ChosenPic)
	}
	
	// Prepare feedback request for algorithm service
	feedbackReq := AlgorithmFeedbackRequest{
		QueryID:         params.QueryID,
		Query:           cached.Query,
		RecommendedPics: cached.RecommendedPics,
		ChosenPic:       params.ChosenPic,
	}
	
	// Call algorithm service feedback endpoint
	err := ctrl.callAlgorithmFeedbackService(ctx, &feedbackReq)
	if err != nil {
		logger.Printf("Failed to submit feedback to algorithm service: %v", err)
		return fmt.Errorf("failed to submit feedback: %w", err)
	}
	
	logger.Printf("Successfully submitted feedback for QueryID: %s", params.QueryID)
	return nil
}

// callAlgorithmFeedbackService calls the spx-algorithm service feedback endpoint
func (ctrl *Controller) callAlgorithmFeedbackService(ctx context.Context, feedbackReq *AlgorithmFeedbackRequest) error {
	algorithmURL := ctrl.getAlgorithmServiceURL() + "/v1/feedback/submit"
	
	reqBody, err := json.Marshal(feedbackReq)
	if err != nil {
		return fmt.Errorf("failed to marshal feedback request: %w", err)
	}
	
	req, err := http.NewRequestWithContext(ctx, "POST", algorithmURL, bytes.NewBuffer(reqBody))
	if err != nil {
		return fmt.Errorf("failed to create feedback request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	
	client := &http.Client{
		Timeout: 30 * time.Second,
	}
	
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("feedback request failed: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("algorithm feedback service returned status: %d", resp.StatusCode)
	}
	
	return nil
}
