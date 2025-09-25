package controller

import (
	"context"
	"fmt"
	"sort"

	"github.com/google/uuid"
	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/copilot"
	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/svggen"
)

// ImageRecommendParams represents parameters for image recommendation.
type ImageRecommendParams struct {
	Text       string    `json:"prompt"`
	TopK       int       `json:"top_k,omitempty"`
	Theme      ThemeType `json:"theme,omitempty"`
	SearchOnly bool      `json:"search_only,omitempty"` // If true, only search existing images, skip AI generation
}

// PromptAnalysisContext holds cached prompt analysis and optimized prompts for a request.
// This prevents multiple AI calls for the same prompt analysis within a single request.
type PromptAnalysisContext struct {
	OriginalPrompt  string         // Original user prompt
	Theme           ThemeType      // Theme being applied
	Analysis        PromptAnalysis // Cached AI analysis result (only computed once)
	OptimizedPrompt string         // Fully optimized prompt for AI generation
	SemanticPrompt  string         // Optimized prompt for semantic search
	ThemePrompt     string         // Optimized prompt for theme search
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
func NewPromptAnalysisContext(ctx context.Context, originalPrompt string, theme ThemeType, copilotClient *copilot.Copilot, searchOnly bool) *PromptAnalysisContext {
	logger := log.GetReqLogger(ctx)

	analysisCtx := &PromptAnalysisContext{
		OriginalPrompt: originalPrompt,
		Theme:          theme,
	}
	
	// If no theme or SearchOnly mode, use original prompt for all variations and skip AI analysis
	if theme == ThemeNone || searchOnly {
		analysisCtx.OptimizedPrompt = originalPrompt
		analysisCtx.SemanticPrompt = originalPrompt
		analysisCtx.ThemePrompt = originalPrompt
		// Analysis is not needed for ThemeNone or SearchOnly, but initialize with defaults
		analysisCtx.Analysis = PromptAnalysis{
			Type:       "default",
			Emotion:    "neutral",
			Complexity: "simple",
			Keywords:   extractKeywords(originalPrompt),
		}
		if searchOnly {
			logger.Printf("SearchOnly mode: skipping AI analysis for theme %s", theme)
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
	analysisCtx.SemanticPrompt = originalPrompt // Keep original prompt for semantic search to preserve semantic meaning
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

// generateQueryID generates a unique query ID for tracking recommendations
func generateQueryID() string {
	return uuid.New().String()
}

// ImageFeedbackParams represents parameters for image recommendation feedback.
type ImageFeedbackParams struct {
	QueryID   string `json:"query_id"`
	ChosenPic int64  `json:"chosen_pic"`
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
	promptCtx := NewPromptAnalysisContext(ctx, params.Text, params.Theme, ctrl.copilot, params.SearchOnly)

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

	// Apply image filtering with degradation strategies if user is authenticated
	var filterMetrics *FilterMetrics
	if mUser, ok := authn.UserFromContext(ctx); ok {
		// Expand search results before filtering to compensate for filtering loss
		expansionRatio := ctrl.imageFilterService.config.GetSearchExpansionRatio()
		expandedTopK := int(float64(params.TopK) * expansionRatio)

		// If we need to expand, perform additional search
		if len(foundResults) < expandedTopK {
			additionalNeeded := expandedTopK - len(foundResults)
			logger.Printf("Expanding search for filtering: requesting %d additional results", additionalNeeded)

			// Perform additional search with higher topK
			var additionalResults []RecommendedImageResult
			if params.Theme != ThemeNone {
				// Create temporary params with higher topK
				tempParams := *params
				tempParams.TopK = expandedTopK
				additionalResults, err = ctrl.dualPathSearchOptimized(ctx, &tempParams, promptCtx)
			} else {
				tempParams := *params
				tempParams.TopK = expandedTopK
				additionalResults, err = ctrl.singleSemanticSearchOptimized(ctx, &tempParams, promptCtx)
			}

			if err == nil && len(additionalResults) > len(foundResults) {
				foundResults = additionalResults
				logger.Printf("Expanded search results: %d total candidates for filtering", len(foundResults))
			}
		}

		// Apply filtering
		filteredResults, metrics, err := ctrl.imageFilterService.FilterResults(
			ctx, mUser.ID, generateQueryID(), promptCtx.OptimizedPrompt, foundResults, params.TopK)
		if err != nil {
			logger.Printf("Filtering failed, using unfiltered results: %v", err)
		} else {
			foundResults = filteredResults
			filterMetrics = metrics
			logger.Printf("Filtering applied: %d candidates -> %d results (%.1f%% filtered)",
				metrics.TotalCandidates, len(foundResults), metrics.FilterRatio*100)
		}
	} else {
		logger.Printf("No authenticated user, skipping image filtering")
	}

	// Generate AI SVGs if we don't have enough results and SearchOnly is false
	if !params.SearchOnly && len(foundResults) < params.TopK {
		needed := params.TopK - len(foundResults)
		logger.Printf("Need to generate %d AI SVG images", needed)

		// OPTIMIZATION: Use cached optimized prompt instead of calling OptimizePromptWithAnalysis again
		generatedResults, err := ctrl.generateAISVGsOptimized(ctx, promptCtx.OptimizedPrompt, provider, params.Theme, needed, len(foundResults))
		if err != nil {
			logger.Printf("Failed to generate AI SVGs: %v", err)
			// Don't fail the entire request, just return what we found
		} else {
			foundResults = append(foundResults, generatedResults...)
		}
	} else if params.SearchOnly && len(foundResults) < params.TopK {
		logger.Printf("SearchOnly mode enabled: found %d results, requested %d (no AI generation)", len(foundResults), params.TopK)
	}

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

	// Record recommendation history for authenticated users
	if mUser, ok := authn.UserFromContext(ctx); ok {
		go func() {
			// Record history asynchronously to avoid blocking the response
			if err := ctrl.imageFilterService.RecordRecommendationHistory(
				context.Background(), mUser.ID, queryID, promptCtx.OptimizedPrompt, foundResults); err != nil {
				logger.Printf("Failed to record recommendation history: %v", err)
			}
		}()
	}

	// Extract recommended pic IDs for feedback tracking
	recommendedPics := make([]int64, len(foundResults))
	for i, result := range foundResults {
		recommendedPics[i] = result.ID
	}

	// Cache recommendation result for feedback tracking
	logger.Printf("Caching recommendation for queryID: %s", queryID)
	err = ctrl.recommendationCache.SetRecommendation(ctx, queryID, promptCtx.OptimizedPrompt, recommendedPics)
	if err != nil {
		logger.Printf("Failed to cache recommendation: %v", err)
	} else {
		logger.Printf("Successfully cached recommendation for queryID: %s", queryID)
	}

	// OPTIMIZATION: Use cached optimized prompt for final query instead of calling OptimizePromptWithAnalysis again
	logger.Printf("Returning recommendation result with %d results", len(foundResults))


	// Log filter metrics if available
	if filterMetrics != nil {
		logger.Printf("Filter metrics: %d total candidates, %d filtered (%.1f%%), degradation level: %d",
			filterMetrics.TotalCandidates, filterMetrics.FilteredCount, filterMetrics.FilterRatio*100, filterMetrics.DegradationLevel)
	}


	return &ImageRecommendResult{
		QueryID:      queryID,
		Query:        promptCtx.OptimizedPrompt,
		ResultsCount: len(foundResults),
		Results:      foundResults,
	}, nil
}

// callAlgorithmService calls the spx-algorithm service for semantic search.
func (ctrl *Controller) callAlgorithmService(ctx context.Context, text string, topK int) (*AlgorithmSearchResponse, error) {
	return ctrl.algorithmService.SearchSimilarImages(ctx, text, topK)
}

// generateAISVGsOptimized generates AI SVG images using pre-optimized prompt.
// PERFORMANCE OPTIMIZATION: Uses cached optimized prompt instead of calling OptimizePromptWithAnalysis.
// The finalPrompt parameter should already have all theme and analysis enhancements applied.
func (ctrl *Controller) generateAISVGsOptimized(ctx context.Context, finalPrompt string, provider svggen.Provider, theme ThemeType, count int, startRank int) ([]RecommendedImageResult, error) {
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
			// Create SVG generation parameters - prompt already optimized, skip redundant processing
			params := &GenerateSVGParams{
				Prompt:      finalPrompt,
				Provider:    provider,
				Theme:       theme,
				IsOptimized: true, // Mark as optimized to skip redundant processing in GenerateSVG
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

// countSearchErrors counts the number of errors for a specific search source.
func countSearchErrors(source string, errors []error) int {
	// Since we only track the error objects, not their sources,
	// this is a simplified implementation that assumes each error corresponds to one source
	if source == "semantic" || source == "theme" {
		return len(errors)
	}
	return 0
}

// getAlgorithmServiceURL returns the algorithm service URL from configuration.
func (ctrl *Controller) getAlgorithmServiceURL() string {
	return ctrl.algorithmService.GetEndpoint()
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

		results := ctrl.processAlgorithmResults(algorithmResp.Results, "search")
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

		results := ctrl.processAlgorithmResults(algorithmResp.Results, "search")
		resultChan <- searchResult{results: results, source: "theme"}
	}()

	// Collect results from both searches
	var semanticResults, themeResults []RecommendedImageResult
	var searchErrors []error

	for i := 0; i < 2; i++ {
		select {
		case result := <-resultChan:
			if result.err != nil {
				logger.Printf("❌ %s search failed: %v", result.source, result.err)
				searchErrors = append(searchErrors, result.err)
			} else {
				if result.source == "semantic" {
					semanticResults = result.results
					logger.Printf("✅ Semantic search completed: %d results (expected: %d)", len(semanticResults), semanticCount)
					for i, res := range semanticResults {
						logger.Printf("  [%d] Semantic result: ID=%d, Path=%s, Similarity=%.3f", i+1, res.ID, res.ImagePath, res.Similarity)
					}
				} else {
					themeResults = result.results
					logger.Printf("✅ Theme search completed: %d results (expected: %d)", len(themeResults), themeCount)
					for i, res := range themeResults {
						logger.Printf("  [%d] Theme result: ID=%d, Path=%s, Similarity=%.3f", i+1, res.ID, res.ImagePath, res.Similarity)
					}
				}
			}
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}

	// Log search summary
	logger.Printf("🔍 Dual-path search summary:")
	logger.Printf("  - Semantic path: %d/%d results, errors: %d", len(semanticResults), semanticCount, countSearchErrors("semantic", searchErrors))
	logger.Printf("  - Theme path: %d/%d results, errors: %d", len(themeResults), themeCount, countSearchErrors("theme", searchErrors))
	logger.Printf("  - Total found: %d, Total errors: %d", len(semanticResults)+len(themeResults), len(searchErrors))

	// If both searches failed, return error
	if len(searchErrors) == 2 {
		logger.Printf("💥 Both searches failed completely - returning error")
		return nil, fmt.Errorf("both searches failed: semantic=%v, theme=%v", searchErrors[0], searchErrors[1])
	}

	// Combine and deduplicate results
	fusedResults := ctrl.combineSearchResults(semanticResults, themeResults)

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
// OPTIMIZATION: Use algorithm service data directly instead of MySQL validation to avoid data inconsistency
func (ctrl *Controller) processAlgorithmResults(algResults []AlgorithmImageResult, source string) []RecommendedImageResult {
	results := make([]RecommendedImageResult, 0, len(algResults))
	logger := log.GetReqLogger(context.Background())

	for i, algResult := range algResults {
		// Use algorithm service data directly - it's the source of truth for search results
		logger.Printf("  ✅ Algorithm result %d: ID=%d, URL=%s, Similarity=%.2f", i+1, algResult.ID, algResult.URL, algResult.Similarity)
		results = append(results, RecommendedImageResult{
			ID:         algResult.ID,
			ImagePath:  algResult.URL,
			Similarity: algResult.Similarity,
			Rank:       algResult.Rank,
			Source:     source,
		})
	}

	logger.Printf("📊 Processed algorithm results: %d input → %d output (no filtering)", len(algResults), len(results))
	return results
}

// combineSearchResults combines and deduplicates results from semantic and theme searches
func (ctrl *Controller) combineSearchResults(semanticResults, themeResults []RecommendedImageResult) []RecommendedImageResult {
	// Combine all results with efficient deduplication using map
	allResults := make([]RecommendedImageResult, 0, len(semanticResults)+len(themeResults))
	seen := make(map[string]bool, len(semanticResults)+len(themeResults))

	// Add semantic results
	for _, result := range semanticResults {
		if !seen[result.ImagePath] {
			allResults = append(allResults, result)
			seen[result.ImagePath] = true
		}
	}

	// Add theme results (skip duplicates)
	for _, result := range themeResults {
		if !seen[result.ImagePath] {
			allResults = append(allResults, result)
			seen[result.ImagePath] = true
		}
	}

	// Sort by similarity score (descending) - optimized with Go's built-in sort
	sort.Slice(allResults, func(i, j int) bool {
		return allResults[i].Similarity > allResults[j].Similarity
	})

	return allResults
}



// SubmitImageFeedback submits user feedback for image recommendations to algorithm service
func (ctrl *Controller) SubmitImageFeedback(ctx context.Context, params *ImageFeedbackParams) error {
	logger := log.GetReqLogger(ctx)
	logger.Printf("Submitting image feedback - QueryID: %s, ChosenPic: %d", params.QueryID, params.ChosenPic)

	// Retrieve cached recommendation result
	cached, err := ctrl.recommendationCache.GetRecommendation(ctx, params.QueryID)
	if err != nil {
		logger.Printf("Cached recommendation not found for QueryID: %s - %v", params.QueryID, err)
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

	// Check idempotency - ensure feedback hasn't already been submitted
	// First check if feedback was already submitted
	submitted, existingChoice, err := ctrl.recommendationCache.GetFeedbackStatus(ctx, params.QueryID)
	if err != nil {
		logger.Printf("Failed to check feedback status: %v", err)
		return fmt.Errorf("failed to check feedback status: %w", err)
	}
	if submitted {
		logger.Printf("Feedback already submitted for QueryID: %s (previous choice: %d)", params.QueryID, existingChoice)
		return fmt.Errorf("feedback already submitted for query_id: %s", params.QueryID)
	}

	// Mark as submitted (atomic operation)
	success, err := ctrl.recommendationCache.MarkFeedbackSubmitted(ctx, params.QueryID, params.ChosenPic)
	if err != nil {
		logger.Printf("Failed to mark feedback as submitted: %v", err)
		return fmt.Errorf("failed to process feedback: %w", err)
	}
	if !success {
		// Another request submitted feedback between our check and mark
		logger.Printf("Feedback was submitted by another request for QueryID: %s", params.QueryID)
		return fmt.Errorf("feedback already submitted for query_id: %s", params.QueryID)
	}

	// Call algorithm service feedback endpoint
	err = ctrl.callAlgorithmFeedbackService(ctx, &feedbackReq)
	if err != nil {
		logger.Printf("Failed to submit feedback to algorithm service: %v", err)
		return fmt.Errorf("failed to submit feedback: %w", err)
	}

	// Mark image as selected in filter service for authenticated users
	if mUser, ok := authn.UserFromContext(ctx); ok {
		go func() {
			// Mark selection asynchronously to avoid blocking the response
			if err := ctrl.imageFilterService.MarkImageSelected(
				context.Background(), mUser.ID, params.QueryID, params.ChosenPic); err != nil {
				logger.Printf("Failed to mark image as selected: %v", err)
			}
		}()
	}

	logger.Printf("Successfully submitted feedback for QueryID: %s", params.QueryID)
	return nil
}

// callAlgorithmFeedbackService calls the spx-algorithm service feedback endpoint
func (ctrl *Controller) callAlgorithmFeedbackService(ctx context.Context, feedbackReq *AlgorithmFeedbackRequest) error {
	//return ctrl.algorithmService.SubmitImageFeedback(ctx, feedbackReq) // 这个功能还没实现
	return nil
}
