package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/model"
)

// ImageRecommendParams represents parameters for image recommendation.
type ImageRecommendParams struct {
	Text  string `json:"text"`
	TopK  int    `json:"top_k,omitempty"`
}

// Validate validates the image recommendation parameters.
func (p *ImageRecommendParams) Validate() (bool, string) {
	if len(p.Text) < 1 {
		return false, "text is required"
	}
	if p.TopK == 0 {
		p.TopK = 8 // Default to top 8 results
	}
	if p.TopK < 1 || p.TopK > 50 {
		return false, "top_k must be between 1 and 50"
	}
	return true, ""
}

// ImageRecommendResult represents the result of image recommendation.
type ImageRecommendResult struct {
	Query        string                    `json:"query"`
	TotalImages  int                       `json:"total_images"`
	ResultsCount int                       `json:"results_count"`
	Results      []RecommendedImageResult  `json:"results"`
}

// RecommendedImageResult represents a single recommended image result.
type RecommendedImageResult struct {
	ID             int64    `json:"id"`
	URL            string   `json:"url"`
	Similarity     float64  `json:"similarity"`
	Rank           int      `json:"rank"`
	Labels         []string `json:"labels,omitempty"`
	ViewCount      int64    `json:"view_count"`
	SelectionCount int64    `json:"selection_count"`
	CreatedAt      time.Time `json:"created_at"`
}

// AlgorithmSearchRequest represents the request to spx-algorithm service.
type AlgorithmSearchRequest struct {
	Text      string   `json:"text"`
	ImageURLs []string `json:"image_urls"`
	TopK      int      `json:"top_k"`
}

// AlgorithmSearchResponse represents the response from spx-algorithm service.
type AlgorithmSearchResponse struct {
	Query        string                     `json:"query"`
	TotalImages  int                        `json:"total_images"`
	ResultsCount int                        `json:"results_count"`
	Results      []AlgorithmImageResult     `json:"results"`
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

	// Step 1: Get all available images from database
	var aiResources []model.AIResource
	if err := ctrl.db.WithContext(ctx).Find(&aiResources).Error; err != nil {
		logger.Printf("Failed to fetch AI resources: %v", err)
		return nil, fmt.Errorf("failed to fetch AI resources: %w", err)
	}

	if len(aiResources) == 0 {
		logger.Printf("No images found in database")
		return &ImageRecommendResult{
			Query:        params.Text,
			TotalImages:  0,
			ResultsCount: 0,
			Results:      []RecommendedImageResult{},
		}, nil
	}

	// Step 2: Prepare image URLs for algorithm service
	imageURLs := make([]string, 0, len(aiResources))
	resourceMap := make(map[string]*model.AIResource)
	
	for i := range aiResources {
		imageURL := aiResources[i].URL
		if imageURL != "" {
			imageURLs = append(imageURLs, imageURL)
			resourceMap[imageURL] = &aiResources[i]
		}
	}

	if len(imageURLs) == 0 {
		logger.Printf("No valid image URLs found")
		return &ImageRecommendResult{
			Query:        params.Text,
			TotalImages:  0,
			ResultsCount: 0,
			Results:      []RecommendedImageResult{},
		}, nil
	}

	// Step 3: Call spx-algorithm service for semantic search
	algorithmResp, err := ctrl.callAlgorithmService(ctx, params.Text, imageURLs, params.TopK)
	if err != nil {
		logger.Printf("Algorithm service call failed: %v", err)
		return nil, fmt.Errorf("algorithm service call failed: %w", err)
	}

	// Step 4: Prepare response with resource information
	results := make([]RecommendedImageResult, 0, len(algorithmResp.Results))
	
	for _, algResult := range algorithmResp.Results {
		resource := resourceMap[algResult.ImagePath]
		if resource == nil {
			logger.Printf("Warning: resource not found for URL: %s", algResult.ImagePath)
			continue
		}

		// Get usage stats
		var stats model.ResourceUsageStats
		ctrl.db.WithContext(ctx).Where("ai_resource_id = ?", resource.ID).First(&stats)

		// Get labels
		var labels []string
		var resourceLabels []model.ResourceLabel
		if err := ctrl.db.WithContext(ctx).Where("aiResourceId = ?", resource.ID).Find(&resourceLabels).Error; err == nil {
			for _, rl := range resourceLabels {
				var label model.Label
				if err := ctrl.db.WithContext(ctx).Where("id = ?", rl.LabelID).First(&label).Error; err == nil {
					labels = append(labels, label.LabelName)
				}
			}
		}

		results = append(results, RecommendedImageResult{
			ID:             resource.ID,
			URL:            resource.URL,
			Similarity:     algResult.Similarity,
			Rank:           algResult.Rank,
			Labels:         labels,
			ViewCount:      stats.ViewCount,
			SelectionCount: stats.SelectionCount,
			CreatedAt:      resource.CreatedAt,
		})

		// Update view count
		go func(resourceID int64) {
			ctrl.updateResourceViewCount(context.Background(), resourceID)
		}(resource.ID)
	}

	logger.Printf("Recommendation completed - found %d results", len(results))

	return &ImageRecommendResult{
		Query:        params.Text,
		TotalImages:  len(imageURLs),
		ResultsCount: len(results),
		Results:      results,
	}, nil
}

// callAlgorithmService calls the spx-algorithm service for semantic search.
func (ctrl *Controller) callAlgorithmService(ctx context.Context, text string, imageURLs []string, topK int) (*AlgorithmSearchResponse, error) {
	algorithmURL := ctrl.getAlgorithmServiceURL() + "/api/search/url"
	
	reqData := AlgorithmSearchRequest{
		Text:      text,
		ImageURLs: imageURLs,
		TopK:      topK,
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

// updateResourceViewCount updates the view count for a resource.
func (ctrl *Controller) updateResourceViewCount(ctx context.Context, resourceID int64) {
	logger := log.GetReqLogger(ctx)
	
	// Use UPSERT to create or update usage stats
	var stats model.ResourceUsageStats
	err := ctrl.db.WithContext(ctx).Where("ai_resource_id = ?", resourceID).First(&stats).Error
	if err != nil {
		// Create new record
		stats = model.ResourceUsageStats{
			AIResourceID: resourceID,
			ViewCount:    1,
			LastUsedAt:   time.Now(),
		}
		if err := ctrl.db.WithContext(ctx).Create(&stats).Error; err != nil {
			logger.Printf("Failed to create usage stats for resource %d: %v", resourceID, err)
		}
	} else {
		// Update existing record
		stats.ViewCount++
		stats.LastUsedAt = time.Now()
		if err := ctrl.db.WithContext(ctx).Save(&stats).Error; err != nil {
			logger.Printf("Failed to update usage stats for resource %d: %v", resourceID, err)
		}
	}
}

// getAlgorithmServiceURL returns the algorithm service URL from configuration.
func (ctrl *Controller) getAlgorithmServiceURL() string {
	// TODO: Get from config when available
	// For now, use localhost default
	return "http://localhost:5000"
}