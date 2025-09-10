package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"path"
	"time"

	"github.com/goplus/builder/spx-backend/internal/config"
	"github.com/goplus/builder/spx-backend/internal/log"
)

// AlgorithmService provides algorithm service functionalities
type AlgorithmService struct {
	config *config.AlgorithmConfig
	client *http.Client
}

// NewAlgorithmService creates a new algorithm service instance
func NewAlgorithmService(cfg *config.AlgorithmConfig) *AlgorithmService {
	timeout := cfg.Timeout
	if timeout == 0 {
		timeout = 30 * time.Second // Default timeout
	}

	return &AlgorithmService{
		config: cfg,
		client: &http.Client{
			Timeout: timeout,
		},
	}
}

// GetEndpoint returns the algorithm service endpoint
func (s *AlgorithmService) GetEndpoint() string {
	if s.config.Endpoint != "" {
		return s.config.Endpoint
	}
	return "http://localhost:5000" // Default fallback
}

// VectorAddRequest represents the request payload for vector service
type VectorAddRequest struct {
	ID         int64  `json:"id"`
	URL        string `json:"url"`
	SVGContent string `json:"svg_content"`
}

// VectorAddResponse represents the response from vector service
type VectorAddResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}

// AddVector calls the vector service API to add SVG data
func (s *AlgorithmService) AddVector(ctx context.Context, id int64, url string, svgContent []byte) error {
	logger := log.GetReqLogger(ctx)
	
	// Prepare request payload
	req := VectorAddRequest{
		ID:         id,
		URL:        url,
		SVGContent: string(svgContent),
	}
	
	jsonData, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("failed to marshal vector request: %w", err)
	}
	
	// Build request URL
	endpoint := s.GetEndpoint()
	vectorURL, err := s.buildURL(endpoint, "/v1/vector/add")
	if err != nil {
		return fmt.Errorf("failed to build vector URL: %w", err)
	}
	
	// Make HTTP request to vector service
	httpReq, err := http.NewRequestWithContext(ctx, "POST", vectorURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create HTTP request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	
	resp, err := s.client.Do(httpReq)
	if err != nil {
		return fmt.Errorf("failed to call vector service: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("vector service returned status: %d", resp.StatusCode)
	}
	
	logger.Printf("Successfully called vector service for ID: %d, URL: %s", id, url)
	return nil
}

// AlgorithmSearchRequest represents the request payload for algorithm service semantic search
type AlgorithmSearchRequest struct {
	Text      string  `json:"text"`
	TopK      int     `json:"top_k"`
	Threshold float64 `json:"threshold"`
}

// AlgorithmSearchResponse represents the response from algorithm service semantic search
type AlgorithmSearchResponse struct {
	Query        string                 `json:"query"`
	ResultsCount int                    `json:"results_count"`
	Results      []AlgorithmImageResult `json:"results"`
}

// AlgorithmImageResult represents a single image result from algorithm service
type AlgorithmImageResult struct {
	ImagePath  string  `json:"image_path"`
	Similarity float64 `json:"similarity"`
	Rank       int     `json:"rank"`
}

// SearchSimilarImages calls the algorithm service for semantic search
func (s *AlgorithmService) SearchSimilarImages(ctx context.Context, text string, topK int) (*AlgorithmSearchResponse, error) {
	logger := log.GetReqLogger(ctx)
	
	// Prepare request payload
	req := AlgorithmSearchRequest{
		Text:      text,
		TopK:      topK,
		Threshold: 0.2,
	}
	
	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal search request: %w", err)
	}
	
	// Build request URL
	endpoint := s.GetEndpoint()
	searchURL, err := s.buildURL(endpoint, "/v1/resource/search")
	if err != nil {
		return nil, fmt.Errorf("failed to build search URL: %w", err)
	}
	
	// Make HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", searchURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create HTTP request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	
	resp, err := s.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to call search service: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("search service returned status: %d", resp.StatusCode)
	}
	
	var result AlgorithmSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode search response: %w", err)
	}
	
	logger.Printf("Successfully searched similar images for text: %s, found: %d results", text, len(result.Results))
	return &result, nil
}

// SearchResourceRequest represents the request payload for resource search
type SearchResourceRequest struct {
	Query    string `json:"query"`
	Limit    int    `json:"limit,omitempty"`
	Offset   int    `json:"offset,omitempty"`
	Category string `json:"category,omitempty"`
}

// SearchResourceResponse represents the response from resource search
type SearchResourceResponse struct {
	Results    []ResourceResult `json:"results"`
	Total      int              `json:"total"`
	HasMore    bool             `json:"has_more"`
}

// ResourceResult represents a single resource search result
type ResourceResult struct {
	ID          int64   `json:"id"`
	URL         string  `json:"url"`
	Score       float64 `json:"score"`
	Category    string  `json:"category,omitempty"`
	Description string  `json:"description,omitempty"`
}

// SearchResource calls the algorithm service to search for resources
func (s *AlgorithmService) SearchResource(ctx context.Context, query string, limit, offset int, category string) (*SearchResourceResponse, error) {
	logger := log.GetReqLogger(ctx)
	
	// Prepare request payload
	req := SearchResourceRequest{
		Query:    query,
		Limit:    limit,
		Offset:   offset,
		Category: category,
	}
	
	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal search request: %w", err)
	}
	
	// Build request URL
	endpoint := s.GetEndpoint()
	searchURL, err := s.buildURL(endpoint, "/api/search/resource")
	if err != nil {
		return nil, fmt.Errorf("failed to build search URL: %w", err)
	}
	
	// Make HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", searchURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create HTTP request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	
	resp, err := s.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to call search service: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("search service returned status: %d", resp.StatusCode)
	}
	
	var result SearchResourceResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode search response: %w", err)
	}
	
	logger.Printf("Successfully searched resources for query: %s, found: %d results", query, len(result.Results))
	return &result, nil
}

// AlgorithmFeedbackRequest represents the request to algorithm feedback service
type AlgorithmFeedbackRequest struct {
	QueryID          string  `json:"query_id"`
	Query            string  `json:"query"`
	RecommendedPics  []int64 `json:"recommended_pics"`
	ChosenPic        int64   `json:"chosen_pic"`
}

// AlgorithmFeedbackResponse represents the response from algorithm feedback service
type AlgorithmFeedbackResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}

// SubmitImageFeedback calls the algorithm service to submit image recommendation feedback
func (s *AlgorithmService) SubmitImageFeedback(ctx context.Context, feedback *AlgorithmFeedbackRequest) error {
	logger := log.GetReqLogger(ctx)
	
	jsonData, err := json.Marshal(feedback)
	if err != nil {
		return fmt.Errorf("failed to marshal feedback request: %w", err)
	}
	
	// Build request URL
	endpoint := s.GetEndpoint()
	feedbackURL, err := s.buildURL(endpoint, "/v1/feedback/submit")
	if err != nil {
		return fmt.Errorf("failed to build feedback URL: %w", err)
	}
	
	// Make HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", feedbackURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create HTTP request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	
	resp, err := s.client.Do(httpReq)
	if err != nil {
		return fmt.Errorf("failed to call feedback service: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("feedback service returned status: %d", resp.StatusCode)
	}
	
	logger.Printf("Successfully submitted feedback for query: %s, chosen pic: %d", feedback.QueryID, feedback.ChosenPic)
	return nil
}

// FeedbackRequest represents the request payload for user feedback
type FeedbackRequest struct {
	QueryID         string  `json:"query_id"`
	ResourceID      int64   `json:"resource_id"`
	FeedbackType    string  `json:"feedback_type"` // "like", "dislike", "click", etc.
	Score           float64 `json:"score,omitempty"`
	UserID          string  `json:"user_id,omitempty"`
	SessionID       string  `json:"session_id,omitempty"`
	AdditionalData  map[string]interface{} `json:"additional_data,omitempty"`
}

// FeedbackResponse represents the response from feedback submission
type FeedbackResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
}

// SubmitFeedback calls the algorithm service to submit user feedback
func (s *AlgorithmService) SubmitFeedback(ctx context.Context, feedback *FeedbackRequest) (*FeedbackResponse, error) {
	logger := log.GetReqLogger(ctx)
	
	jsonData, err := json.Marshal(feedback)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal feedback request: %w", err)
	}
	
	// Build request URL
	endpoint := s.GetEndpoint()
	feedbackURL, err := s.buildURL(endpoint, "/v1/feedback/submit")
	if err != nil {
		return nil, fmt.Errorf("failed to build feedback URL: %w", err)
	}
	
	// Make HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", feedbackURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create HTTP request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	
	resp, err := s.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to call feedback service: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("feedback service returned status: %d", resp.StatusCode)
	}
	
	var result FeedbackResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode feedback response: %w", err)
	}
	
	logger.Printf("Successfully submitted feedback for query: %s, resource: %d", feedback.QueryID, feedback.ResourceID)
	return &result, nil
}

// buildURL builds a complete URL from base endpoint and path
func (s *AlgorithmService) buildURL(endpoint, apiPath string) (string, error) {
	baseURL, err := url.Parse(endpoint)
	if err != nil {
		return "", fmt.Errorf("invalid endpoint URL: %w", err)
	}
	
	baseURL.Path = path.Join(baseURL.Path, apiPath)
	return baseURL.String(), nil
}

// HealthCheck checks if the algorithm service is healthy
func (s *AlgorithmService) HealthCheck(ctx context.Context) error {
	endpoint := s.GetEndpoint()
	healthURL, err := s.buildURL(endpoint, "/health")
	if err != nil {
		return fmt.Errorf("failed to build health URL: %w", err)
	}
	
	httpReq, err := http.NewRequestWithContext(ctx, "GET", healthURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create health check request: %w", err)
	}
	
	resp, err := s.client.Do(httpReq)
	if err != nil {
		return fmt.Errorf("failed to perform health check: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("algorithm service health check failed with status: %d", resp.StatusCode)
	}
	
	return nil
}