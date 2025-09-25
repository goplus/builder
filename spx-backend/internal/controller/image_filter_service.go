package controller

import (
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/goplus/builder/spx-backend/internal/config"
	"github.com/goplus/builder/spx-backend/internal/log"
	"github.com/goplus/builder/spx-backend/internal/model"
)

// ImageFilterService handles image recommendation filtering with degradation strategies
type ImageFilterService struct {
	db     *gorm.DB
	config *config.ImageFilterConfig
}

// NewImageFilterService creates a new image filter service
func NewImageFilterService(db *gorm.DB, cfg *config.ImageFilterConfig) *ImageFilterService {
	if cfg == nil {
		// Use default config if none provided
		cfg = &config.ImageFilterConfig{
			Enabled:               true,
			DefaultWindowDays:     30,
			DefaultMaxFilterRatio: 0.8,
			SearchExpansionRatio:  2.0,
			EnableDegradation:     true,
			EnableMetrics:         true,
		}
	}
	return &ImageFilterService{
		db:     db,
		config: cfg,
	}
}

// FilterConfig holds configuration for filtering behavior
type FilterConfig struct {
	FilterWindowDays int     // Number of days to look back for filtering history
	MaxFilterRatio   float64 // Maximum ratio of results that can be filtered (0-1)
	Enabled          bool    // Whether filtering is enabled
}

// DefaultFilterConfig returns the default filter configuration from service config
func (s *ImageFilterService) DefaultFilterConfig() *FilterConfig {
	return &FilterConfig{
		FilterWindowDays: s.config.GetDefaultWindowDays(),
		MaxFilterRatio:   s.config.GetDefaultMaxFilterRatio(),
		Enabled:          s.config.Enabled,
	}
}

// DegradationStrategy represents different degradation approaches
type DegradationStrategy string

const (
	DegradationNone              DegradationStrategy = "none"
	DegradationTimeWindow        DegradationStrategy = "time_window_expansion"
	DegradationThemeExpansion    DegradationStrategy = "theme_expansion"
	DegradationSimilarityThreshold DegradationStrategy = "similarity_threshold_reduction"
	DegradationNewUserMix        DegradationStrategy = "new_user_content_mix"
)

// FilterContext holds context information for filtering operation
type FilterContext struct {
	UserID          int64
	QueryID         string
	Query           string
	RequestedCount  int
	Config          *FilterConfig
	DegradationUsed DegradationStrategy
	Metrics         *FilterMetrics
}

// FilterMetrics tracks filtering performance
type FilterMetrics struct {
	TotalCandidates     int
	FilteredCount       int
	FilterRatio         float64
	DegradationLevel    int
	DegradationStrategy string
	FinalResultCount    int
}

// FilterResults applies filtering to search results with degradation strategies
func (s *ImageFilterService) FilterResults(ctx context.Context, userID int64, queryID string, query string,
	candidates []RecommendedImageResult, requestedCount int) ([]RecommendedImageResult, *FilterMetrics, error) {

	logger := log.GetReqLogger(ctx)

	// Get user filter configuration
	config, err := s.getUserFilterConfig(ctx, userID)
	if err != nil {
		logger.Printf("Failed to get user filter config, using default: %v", err)
		config = s.DefaultFilterConfig()
	}

	// If filtering is disabled globally, return original results
	if !s.config.Enabled || !config.Enabled {
		return candidates, &FilterMetrics{
			TotalCandidates:  len(candidates),
			FilteredCount:    0,
			FilterRatio:      0,
			FinalResultCount: len(candidates),
		}, nil
	}

	// Create filter context
	filterCtx := &FilterContext{
		UserID:          userID,
		QueryID:         queryID,
		Query:           query,
		RequestedCount:  requestedCount,
		Config:          config,
		DegradationUsed: DegradationNone,
		Metrics: &FilterMetrics{
			TotalCandidates: len(candidates),
		},
	}

	// Apply filtering with degradation strategies
	filteredResults, err := s.applyFilteringWithDegradation(ctx, filterCtx, candidates)
	if err != nil {
		return candidates, filterCtx.Metrics, fmt.Errorf("filtering failed: %w", err)
	}

	// Update final metrics
	filterCtx.Metrics.FinalResultCount = len(filteredResults)
	filterCtx.Metrics.FilteredCount = filterCtx.Metrics.TotalCandidates - len(filteredResults)
	if filterCtx.Metrics.TotalCandidates > 0 {
		filterCtx.Metrics.FilterRatio = float64(filterCtx.Metrics.FilteredCount) / float64(filterCtx.Metrics.TotalCandidates)
	}

	// Store metrics asynchronously if enabled
	if s.config.EnableMetrics {
		go func() {
			if err := s.storeFilterMetrics(context.Background(), filterCtx); err != nil {
				logger.Printf("Failed to store filter metrics: %v", err)
			}
		}()
	}

	logger.Printf("Filtering completed: %d candidates -> %d results (%.1f%% filtered, degradation: %s)",
		filterCtx.Metrics.TotalCandidates, len(filteredResults), filterCtx.Metrics.FilterRatio*100, filterCtx.DegradationUsed)

	return filteredResults, filterCtx.Metrics, nil
}

// applyFilteringWithDegradation applies filtering with progressive degradation strategies
func (s *ImageFilterService) applyFilteringWithDegradation(ctx context.Context, filterCtx *FilterContext,
	candidates []RecommendedImageResult) ([]RecommendedImageResult, error) {

	logger := log.GetReqLogger(ctx)

	// Try normal filtering first
	filtered, err := s.applyBasicFiltering(ctx, filterCtx, candidates)
	if err != nil {
		return candidates, err
	}

	// Check if we have enough results
	if len(filtered) >= filterCtx.RequestedCount {
		return filtered[:filterCtx.RequestedCount], nil
	}

	// Calculate filter ratio
	filterRatio := float64(len(candidates)-len(filtered)) / float64(len(candidates))

	// Check if we need degradation (filter ratio too high) and degradation is enabled
	if s.config.EnableDegradation && filterRatio > filterCtx.Config.MaxFilterRatio {
		logger.Printf("High filter ratio detected (%.1f%% > %.1f%%), applying degradation strategies",
			filterRatio*100, filterCtx.Config.MaxFilterRatio*100)

		return s.applyDegradationStrategies(ctx, filterCtx, candidates)
	}

	return filtered, nil
}

// applyBasicFiltering applies basic filtering based on user history
func (s *ImageFilterService) applyBasicFiltering(ctx context.Context, filterCtx *FilterContext,
	candidates []RecommendedImageResult) ([]RecommendedImageResult, error) {

	// Get user's recommendation history within the filter window
	historyImageIDs, err := s.getUserRecommendationHistory(ctx, filterCtx.UserID, filterCtx.Config.FilterWindowDays)
	if err != nil {
		return candidates, fmt.Errorf("failed to get user history: %w", err)
	}

	// Create a map for fast lookup
	seenImages := make(map[int64]bool, len(historyImageIDs))
	for _, imageID := range historyImageIDs {
		seenImages[imageID] = true
	}

	// Filter out already recommended images
	var filtered []RecommendedImageResult
	for _, candidate := range candidates {
		if !seenImages[candidate.ID] {
			filtered = append(filtered, candidate)
		}
	}

	return filtered, nil
}

// applyDegradationStrategies applies progressive degradation strategies when filtering is too aggressive
func (s *ImageFilterService) applyDegradationStrategies(ctx context.Context, filterCtx *FilterContext,
	candidates []RecommendedImageResult) ([]RecommendedImageResult, error) {

	logger := log.GetReqLogger(ctx)

	// Strategy 1: Time window expansion
	degradationLevels := []int{15, 7, 3, 1} // Reduce window to 15, 7, 3, 1 days
	for level, windowDays := range degradationLevels {
		filterCtx.Metrics.DegradationLevel = level + 1
		filterCtx.DegradationUsed = DegradationTimeWindow
		filterCtx.Metrics.DegradationStrategy = string(DegradationTimeWindow)

		logger.Printf("Applying degradation level %d: reducing time window to %d days", level+1, windowDays)

		// Try filtering with reduced time window
		tempConfig := *filterCtx.Config
		tempConfig.FilterWindowDays = windowDays
		tempCtx := *filterCtx
		tempCtx.Config = &tempConfig

		filtered, err := s.applyBasicFiltering(ctx, &tempCtx, candidates)
		if err != nil {
			continue
		}

		filterRatio := float64(len(candidates)-len(filtered)) / float64(len(candidates))
		if filterRatio <= filterCtx.Config.MaxFilterRatio && len(filtered) >= filterCtx.RequestedCount {
			logger.Printf("Degradation successful at level %d: %.1f%% filter ratio", level+1, filterRatio*100)
			return filtered[:filterCtx.RequestedCount], nil
		}
	}

	// Strategy 2: If time window expansion didn't work, use similarity threshold mixing
	logger.Printf("Time window degradation failed, applying similarity threshold strategy")
	filterCtx.Metrics.DegradationLevel = 5
	filterCtx.DegradationUsed = DegradationSimilarityThreshold
	filterCtx.Metrics.DegradationStrategy = string(DegradationSimilarityThreshold)

	return s.applySimilarityThresholdStrategy(ctx, filterCtx, candidates)
}

// applySimilarityThresholdStrategy mixes filtered and unfiltered results based on similarity scores
func (s *ImageFilterService) applySimilarityThresholdStrategy(ctx context.Context, filterCtx *FilterContext,
	candidates []RecommendedImageResult) ([]RecommendedImageResult, error) {

	logger := log.GetReqLogger(ctx)

	// Get filtered results
	filtered, err := s.applyBasicFiltering(ctx, filterCtx, candidates)
	if err != nil {
		return candidates, err
	}

	// If we have enough filtered results, use them
	if len(filtered) >= filterCtx.RequestedCount {
		return filtered[:filterCtx.RequestedCount], nil
	}

	// Create map of filtered IDs for fast lookup
	filteredIDs := make(map[int64]bool)
	for _, result := range filtered {
		filteredIDs[result.ID] = true
	}

	// Get unfiltered high-similarity candidates
	var unfiltered []RecommendedImageResult
	for _, candidate := range candidates {
		if !filteredIDs[candidate.ID] && candidate.Similarity > 0.7 { // High similarity threshold
			unfiltered = append(unfiltered, candidate)
		}
	}

	// Combine filtered and high-similarity unfiltered results
	var combined []RecommendedImageResult
	combined = append(combined, filtered...)

	needed := filterCtx.RequestedCount - len(filtered)
	if needed > 0 && len(unfiltered) > 0 {
		if needed > len(unfiltered) {
			needed = len(unfiltered)
		}
		combined = append(combined, unfiltered[:needed]...)
		logger.Printf("Mixed %d filtered + %d high-similarity unfiltered results", len(filtered), needed)
	}

	return combined, nil
}

// getUserFilterConfig retrieves user-specific filter configuration
func (s *ImageFilterService) getUserFilterConfig(ctx context.Context, userID int64) (*FilterConfig, error) {
	// If no database is available, return default config
	if s.db == nil {
		return s.DefaultFilterConfig(), nil
	}

	var config model.UserImageFilterConfig
	err := s.db.WithContext(ctx).Where("user_id = ?", userID).First(&config).Error

	if err == gorm.ErrRecordNotFound {
		// Create default config for new user using service config defaults
		defaultConfig := model.UserImageFilterConfig{
			UserID:           userID,
			FilterWindowDays: s.config.GetDefaultWindowDays(),
			MaxFilterRatio:   s.config.GetDefaultMaxFilterRatio(),
		}

		err = s.db.WithContext(ctx).Create(&defaultConfig).Error
		if err != nil {
			return s.DefaultFilterConfig(), err
		}

		return &FilterConfig{
			FilterWindowDays: defaultConfig.FilterWindowDays,
			MaxFilterRatio:   defaultConfig.MaxFilterRatio,
			Enabled:          s.config.Enabled,
		}, nil
	}

	if err != nil {
		return nil, err
	}

	return &FilterConfig{
		FilterWindowDays: config.FilterWindowDays,
		MaxFilterRatio:   config.MaxFilterRatio,
		Enabled:          true,
	}, nil
}

// getUserRecommendationHistory gets image IDs that have been recommended to user within the time window
func (s *ImageFilterService) getUserRecommendationHistory(ctx context.Context, userID int64, windowDays int) ([]int64, error) {
	// If no database is available, return empty history
	if s.db == nil {
		return []int64{}, nil
	}

	var imageIDs []int64

	cutoffTime := time.Now().AddDate(0, 0, -windowDays)

	err := s.db.WithContext(ctx).
		Model(&model.UserImageRecommendationHistory{}).
		Where("user_id = ? AND created_at > ?", userID, cutoffTime).
		Pluck("image_id", &imageIDs).Error

	return imageIDs, err
}

// RecordRecommendationHistory records the images that were recommended to a user
func (s *ImageFilterService) RecordRecommendationHistory(ctx context.Context, userID int64, queryID string,
	query string, results []RecommendedImageResult) error {

	logger := log.GetReqLogger(ctx)

	// If no database is available, skip recording
	if s.db == nil {
		logger.Printf("Database not available, skipping recommendation history recording")
		return nil
	}

	if len(results) == 0 {
		return nil
	}

	// Prepare history records
	var histories []model.UserImageRecommendationHistory
	for _, result := range results {
		history := model.UserImageRecommendationHistory{
			UserID:     userID,
			ImageID:    result.ID,
			QueryID:    queryID,
			Query:      query,
			Source:     result.Source,
			Similarity: result.Similarity,
			Rank:       result.Rank,
			Selected:   false,
		}
		histories = append(histories, history)
	}

	// Batch insert
	err := s.db.WithContext(ctx).CreateInBatches(histories, 100).Error
	if err != nil {
		logger.Printf("Failed to record recommendation history: %v", err)
		return fmt.Errorf("failed to record recommendation history: %w", err)
	}

	logger.Printf("Recorded %d recommendation history entries for user %d", len(histories), userID)
	return nil
}

// MarkImageSelected marks an image as selected by the user
func (s *ImageFilterService) MarkImageSelected(ctx context.Context, userID int64, queryID string, imageID int64) error {
	// If no database is available, skip marking
	if s.db == nil {
		return nil
	}

	now := time.Now()

	result := s.db.WithContext(ctx).
		Model(&model.UserImageRecommendationHistory{}).
		Where("user_id = ? AND query_id = ? AND image_id = ?", userID, queryID, imageID).
		Updates(map[string]interface{}{
			"selected":    true,
			"selected_at": &now,
		})

	if result.Error != nil {
		return fmt.Errorf("failed to mark image as selected: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("no recommendation history found for user %d, query %s, image %d", userID, queryID, imageID)
	}

	return nil
}

// storeFilterMetrics stores filtering performance metrics
func (s *ImageFilterService) storeFilterMetrics(ctx context.Context, filterCtx *FilterContext) error {
	// If no database is available, skip storing metrics
	if s.db == nil {
		return nil
	}

	metrics := &model.ImageFilterMetrics{
		UserID:              filterCtx.UserID,
		QueryID:             filterCtx.QueryID,
		TotalCandidates:     filterCtx.Metrics.TotalCandidates,
		FilteredCount:       filterCtx.Metrics.FilteredCount,
		FilterRatio:         filterCtx.Metrics.FilterRatio,
		DegradationLevel:    filterCtx.Metrics.DegradationLevel,
		DegradationStrategy: filterCtx.Metrics.DegradationStrategy,
		FinalResultCount:    filterCtx.Metrics.FinalResultCount,
	}

	return s.db.WithContext(ctx).Create(metrics).Error
}

// GetFilterStats returns filtering statistics for monitoring
func (s *ImageFilterService) GetFilterStats(ctx context.Context, userID int64, days int) (map[string]interface{}, error) {
	cutoffTime := time.Now().AddDate(0, 0, -days)

	var stats struct {
		TotalQueries       int64   `json:"total_queries"`
		AvgFilterRatio     float64 `json:"avg_filter_ratio"`
		DegradationQueries int64   `json:"degradation_queries"`
		TotalRecommendations int64 `json:"total_recommendations"`
		SelectedCount      int64   `json:"selected_count"`
	}

	// Get metrics stats
	err := s.db.WithContext(ctx).
		Model(&model.ImageFilterMetrics{}).
		Where("user_id = ? AND created_at > ?", userID, cutoffTime).
		Select("COUNT(*) as total_queries, AVG(filter_ratio) as avg_filter_ratio, SUM(CASE WHEN degradation_level > 0 THEN 1 ELSE 0 END) as degradation_queries").
		Scan(&stats).Error

	if err != nil {
		return nil, err
	}

	// Get recommendation stats
	s.db.WithContext(ctx).
		Model(&model.UserImageRecommendationHistory{}).
		Where("user_id = ? AND created_at > ?", userID, cutoffTime).
		Count(&stats.TotalRecommendations)

	s.db.WithContext(ctx).
		Model(&model.UserImageRecommendationHistory{}).
		Where("user_id = ? AND created_at > ? AND selected = ?", userID, cutoffTime, true).
		Count(&stats.SelectedCount)

	return map[string]interface{}{
		"user_id":              userID,
		"period_days":          days,
		"total_queries":        stats.TotalQueries,
		"avg_filter_ratio":     stats.AvgFilterRatio,
		"degradation_queries":  stats.DegradationQueries,
		"total_recommendations": stats.TotalRecommendations,
		"selected_count":       stats.SelectedCount,
		"selection_rate":       float64(stats.SelectedCount) / float64(stats.TotalRecommendations),
	}, nil
}