package controller

import (
	"context"
	"testing"

	"github.com/goplus/builder/spx-backend/internal/authn"
	"github.com/goplus/builder/spx-backend/internal/config"
	"github.com/goplus/builder/spx-backend/internal/model"
)

func TestImageRecommendationWithFiltering_Integration(t *testing.T) {
	// Test that filtering doesn't break the recommendation flow
	// This is a simplified integration test without real database

	// Create a test image filter service with custom config
	filterConfig := &config.ImageFilterConfig{
		Enabled:               true,
		DefaultWindowDays:     30,
		DefaultMaxFilterRatio: 0.8,
		SearchExpansionRatio:  2.0,
		EnableDegradation:     true,
		EnableMetrics:         true,
	}

	filterService := NewImageFilterService(nil, filterConfig)

	// Test that the service initializes correctly
	if filterService == nil {
		t.Fatal("Filter service should not be nil")
	}

	if filterService.config != filterConfig {
		t.Error("Filter service should use provided config")
	}

	// Test FilterResults with empty candidates (edge case)
	ctx := context.Background()
	userID := int64(123)
	queryID := "test-query"
	query := "test query"
	var candidates []RecommendedImageResult
	requestedCount := 4

	results, metrics, err := filterService.FilterResults(ctx, userID, queryID, query, candidates, requestedCount)

	// Should not error on empty input
	if err != nil {
		t.Errorf("FilterResults should not error on empty candidates: %v", err)
	}

	// Should return empty results
	if len(results) != 0 {
		t.Errorf("FilterResults should return empty results for empty candidates, got %d", len(results))
	}

	// Should have valid metrics
	if metrics == nil {
		t.Error("FilterResults should return metrics")
	} else {
		if metrics.TotalCandidates != 0 {
			t.Errorf("Expected TotalCandidates=0, got %d", metrics.TotalCandidates)
		}
		if metrics.FilteredCount != 0 {
			t.Errorf("Expected FilteredCount=0, got %d", metrics.FilteredCount)
		}
		if metrics.FinalResultCount != 0 {
			t.Errorf("Expected FinalResultCount=0, got %d", metrics.FinalResultCount)
		}
	}
}

func TestImageRecommendationWithFiltering_DisabledFiltering(t *testing.T) {
	// Test with filtering disabled
	filterConfig := &config.ImageFilterConfig{
		Enabled:               false, // Disabled
		DefaultWindowDays:     30,
		DefaultMaxFilterRatio: 0.8,
		SearchExpansionRatio:  2.0,
		EnableDegradation:     true,
		EnableMetrics:         true,
	}

	filterService := NewImageFilterService(nil, filterConfig)

	ctx := context.Background()
	userID := int64(123)
	queryID := "test-query"
	query := "test query"
	candidates := []RecommendedImageResult{
		{ID: 1, ImagePath: "/path1", Similarity: 0.9, Rank: 1, Source: "search"},
		{ID: 2, ImagePath: "/path2", Similarity: 0.8, Rank: 2, Source: "search"},
	}
	requestedCount := 4

	results, metrics, err := filterService.FilterResults(ctx, userID, queryID, query, candidates, requestedCount)

	// Should not error
	if err != nil {
		t.Errorf("FilterResults should not error when disabled: %v", err)
	}

	// Should return all candidates unchanged when filtering is disabled
	if len(results) != len(candidates) {
		t.Errorf("Expected %d results when filtering disabled, got %d", len(candidates), len(results))
	}

	// Should have valid metrics showing no filtering occurred
	if metrics == nil {
		t.Error("FilterResults should return metrics")
	} else {
		if metrics.FilteredCount != 0 {
			t.Errorf("Expected FilteredCount=0 when disabled, got %d", metrics.FilteredCount)
		}
		if metrics.FilterRatio != 0 {
			t.Errorf("Expected FilterRatio=0 when disabled, got %.3f", metrics.FilterRatio)
		}
	}
}

func TestImageRecommendationWithFiltering_ConfigDefaults(t *testing.T) {
	// Test that default configs work correctly
	filterService := NewImageFilterService(nil, nil)

	defaultConfig := filterService.DefaultFilterConfig()

	if defaultConfig.FilterWindowDays != 30 {
		t.Errorf("Expected default FilterWindowDays=30, got %d", defaultConfig.FilterWindowDays)
	}

	if defaultConfig.MaxFilterRatio != 0.8 {
		t.Errorf("Expected default MaxFilterRatio=0.8, got %.2f", defaultConfig.MaxFilterRatio)
	}

	if !defaultConfig.Enabled {
		t.Error("Expected default filtering to be enabled")
	}

	// Test config getter methods
	if filterService.config.GetDefaultWindowDays() != 30 {
		t.Errorf("Expected GetDefaultWindowDays()=30, got %d", filterService.config.GetDefaultWindowDays())
	}

	if filterService.config.GetDefaultMaxFilterRatio() != 0.8 {
		t.Errorf("Expected GetDefaultMaxFilterRatio()=0.8, got %.2f", filterService.config.GetDefaultMaxFilterRatio())
	}

	if filterService.config.GetSearchExpansionRatio() != 2.0 {
		t.Errorf("Expected GetSearchExpansionRatio()=2.0, got %.2f", filterService.config.GetSearchExpansionRatio())
	}
}

func TestImageRecommendationParams_Validation(t *testing.T) {
	// Test parameter validation still works after our changes
	tests := []struct {
		name      string
		params    ImageRecommendParams
		expectOK  bool
		expectMsg string
	}{
		{
			name: "Valid params",
			params: ImageRecommendParams{
				Text:  "test image",
				TopK:  4,
				Theme: ThemeNone,
			},
			expectOK: true,
		},
		{
			name: "Empty text",
			params: ImageRecommendParams{
				Text:  "",
				TopK:  4,
				Theme: ThemeNone,
			},
			expectOK:  false,
			expectMsg: "text is required",
		},
		{
			name: "Zero TopK gets default",
			params: ImageRecommendParams{
				Text:  "test image",
				TopK:  0, // Should get default of 4
				Theme: ThemeNone,
			},
			expectOK: true,
		},
		{
			name: "TopK too high",
			params: ImageRecommendParams{
				Text:  "test image",
				TopK:  100, // > 50 limit
				Theme: ThemeNone,
			},
			expectOK:  false,
			expectMsg: "top_k must be between 1 and 50",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			valid, msg := test.params.Validate()

			if valid != test.expectOK {
				t.Errorf("Expected valid=%v, got %v", test.expectOK, valid)
			}

			if !test.expectOK && msg != test.expectMsg {
				t.Errorf("Expected message=%q, got %q", test.expectMsg, msg)
			}

			// For zero TopK, verify it gets set to default
			if test.params.TopK == 0 && valid {
				if test.params.TopK != 4 {
					t.Errorf("Expected TopK to be set to default 4, got %d", test.params.TopK)
				}
			}
		})
	}
}

func TestImageFeedbackParams_Validation(t *testing.T) {
	// Test feedback parameter validation
	tests := []struct {
		name      string
		params    ImageFeedbackParams
		expectOK  bool
		expectMsg string
	}{
		{
			name: "Valid params",
			params: ImageFeedbackParams{
				QueryID:   "test-query-id",
				ChosenPic: 123,
			},
			expectOK: true,
		},
		{
			name: "Empty QueryID",
			params: ImageFeedbackParams{
				QueryID:   "",
				ChosenPic: 123,
			},
			expectOK:  false,
			expectMsg: "query_id is required",
		},
		{
			name: "Zero ChosenPic",
			params: ImageFeedbackParams{
				QueryID:   "test-query-id",
				ChosenPic: 0,
			},
			expectOK:  false,
			expectMsg: "chosen_pic must be greater than 0",
		},
		{
			name: "Negative ChosenPic",
			params: ImageFeedbackParams{
				QueryID:   "test-query-id",
				ChosenPic: -1,
			},
			expectOK:  false,
			expectMsg: "chosen_pic must be greater than 0",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			valid, msg := test.params.Validate()

			if valid != test.expectOK {
				t.Errorf("Expected valid=%v, got %v", test.expectOK, valid)
			}

			if !test.expectOK && msg != test.expectMsg {
				t.Errorf("Expected message=%q, got %q", test.expectMsg, msg)
			}
		})
	}
}

func TestUserContext_Integration(t *testing.T) {
	// Test that user context integration works correctly
	ctx := context.Background()

	// Test without user context
	_, ok := authn.UserFromContext(ctx)
	if ok {
		t.Error("Expected no user in empty context")
	}

	// Test with user context
	testUser := &model.User{
		Model: model.Model{ID: 123},
	}

	ctxWithUser := authn.NewContextWithUser(ctx, testUser)
	retrievedUser, ok := authn.UserFromContext(ctxWithUser)

	if !ok {
		t.Error("Expected user to be found in context")
	}

	if retrievedUser == nil {
		t.Error("Retrieved user should not be nil")
	}

	if retrievedUser.ID != 123 {
		t.Errorf("Expected user ID=123, got %d", retrievedUser.ID)
	}
}

func TestRecommendedImageResult_Structure(t *testing.T) {
	// Test that RecommendedImageResult structure is correct
	result := RecommendedImageResult{
		ID:         123,
		ImagePath:  "/path/to/image.jpg",
		Similarity: 0.95,
		Rank:       1,
		Source:     "search",
	}

	if result.ID != 123 {
		t.Errorf("Expected ID=123, got %d", result.ID)
	}

	if result.ImagePath != "/path/to/image.jpg" {
		t.Errorf("Expected ImagePath=/path/to/image.jpg, got %s", result.ImagePath)
	}

	if result.Similarity != 0.95 {
		t.Errorf("Expected Similarity=0.95, got %.3f", result.Similarity)
	}

	if result.Rank != 1 {
		t.Errorf("Expected Rank=1, got %d", result.Rank)
	}

	if result.Source != "search" {
		t.Errorf("Expected Source=search, got %s", result.Source)
	}
}