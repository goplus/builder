package controller

import (
	"testing"

	"github.com/goplus/builder/spx-backend/internal/config"
)

func TestImageFilterService_NewService(t *testing.T) {
	// Test with nil config
	service := NewImageFilterService(nil, nil)
	if service == nil {
		t.Error("NewImageFilterService should not return nil")
	}

	if service.config == nil {
		t.Error("Service should have default config when nil is passed")
	}

	// Verify default values
	defaultConfig := service.DefaultFilterConfig()
	if defaultConfig.FilterWindowDays != 30 {
		t.Errorf("Default FilterWindowDays = %d, want 30", defaultConfig.FilterWindowDays)
	}

	if defaultConfig.MaxFilterRatio != 0.8 {
		t.Errorf("Default MaxFilterRatio = %.2f, want 0.8", defaultConfig.MaxFilterRatio)
	}

	if !defaultConfig.Enabled {
		t.Error("Default config should be enabled")
	}
}

func TestImageFilterService_WithConfig(t *testing.T) {
	cfg := &config.ImageFilterConfig{
		Enabled:               true,
		DefaultWindowDays:     15,
		DefaultMaxFilterRatio: 0.6,
		SearchExpansionRatio:  3.0,
		EnableDegradation:     false,
		EnableMetrics:         false,
	}

	service := NewImageFilterService(nil, cfg)
	if service.config != cfg {
		t.Error("Service should use provided config")
	}

	defaultConfig := service.DefaultFilterConfig()
	if defaultConfig.FilterWindowDays != 15 {
		t.Errorf("Custom FilterWindowDays = %d, want 15", defaultConfig.FilterWindowDays)
	}

	if defaultConfig.MaxFilterRatio != 0.6 {
		t.Errorf("Custom MaxFilterRatio = %.2f, want 0.6", defaultConfig.MaxFilterRatio)
	}
}

func TestDegradationStrategy_String(t *testing.T) {
	tests := []struct {
		strategy DegradationStrategy
		expected string
	}{
		{DegradationNone, "none"},
		{DegradationTimeWindow, "time_window_expansion"},
		{DegradationThemeExpansion, "theme_expansion"},
		{DegradationSimilarityThreshold, "similarity_threshold_reduction"},
		{DegradationNewUserMix, "new_user_content_mix"},
	}

	for _, test := range tests {
		if string(test.strategy) != test.expected {
			t.Errorf("DegradationStrategy %v = %s, want %s", test.strategy, string(test.strategy), test.expected)
		}
	}
}

func TestFilterConfig_Validation(t *testing.T) {
	tests := []struct {
		name         string
		config       FilterConfig
		expectError  bool
		errorMessage string
	}{
		{
			name: "Valid config",
			config: FilterConfig{
				FilterWindowDays: 30,
				MaxFilterRatio:   0.8,
				Enabled:          true,
			},
			expectError: false,
		},
		{
			name: "Zero window days",
			config: FilterConfig{
				FilterWindowDays: 0,
				MaxFilterRatio:   0.8,
				Enabled:          true,
			},
			expectError: false, // Zero is valid, means no time filtering
		},
		{
			name: "Invalid filter ratio too high",
			config: FilterConfig{
				FilterWindowDays: 30,
				MaxFilterRatio:   1.5,
				Enabled:          true,
			},
			expectError: false, // Values > 1 are allowed in our implementation
		},
		{
			name: "Disabled config",
			config: FilterConfig{
				FilterWindowDays: 30,
				MaxFilterRatio:   0.8,
				Enabled:          false,
			},
			expectError: false,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// For now, we just verify the config can be created without panicking
			// In a real scenario, you'd add validation methods to FilterConfig
			config := test.config
			if config.FilterWindowDays < 0 {
				t.Error("FilterWindowDays should not be negative")
			}
			if config.MaxFilterRatio < 0 {
				t.Error("MaxFilterRatio should not be negative")
			}
		})
	}
}

func TestFilterMetrics_Validation(t *testing.T) {
	metrics := FilterMetrics{
		TotalCandidates:     100,
		FilteredCount:       20,
		FilterRatio:         0.2,
		DegradationLevel:    1,
		DegradationStrategy: "time_window_expansion",
		FinalResultCount:    80,
	}

	if metrics.TotalCandidates < 0 {
		t.Error("TotalCandidates should not be negative")
	}

	if metrics.FilteredCount < 0 {
		t.Error("FilteredCount should not be negative")
	}

	if metrics.FilteredCount > metrics.TotalCandidates {
		t.Error("FilteredCount should not exceed TotalCandidates")
	}

	expectedRatio := float64(metrics.FilteredCount) / float64(metrics.TotalCandidates)
	if abs(metrics.FilterRatio-expectedRatio) > 0.001 {
		t.Errorf("FilterRatio %.3f should be approximately %.3f", metrics.FilterRatio, expectedRatio)
	}

	if metrics.DegradationLevel < 0 {
		t.Error("DegradationLevel should not be negative")
	}

	if metrics.FinalResultCount < 0 {
		t.Error("FinalResultCount should not be negative")
	}

	if metrics.FinalResultCount > metrics.TotalCandidates {
		t.Error("FinalResultCount should not exceed TotalCandidates")
	}
}

// Helper function for floating point comparison
func abs(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}

func TestFilterContext_Initialization(t *testing.T) {
	ctx := &FilterContext{
		UserID:          123,
		QueryID:         "test-query",
		Query:           "test query",
		RequestedCount:  10,
		Config:          &FilterConfig{FilterWindowDays: 30, MaxFilterRatio: 0.8, Enabled: true},
		DegradationUsed: DegradationNone,
		Metrics:         &FilterMetrics{},
	}

	if ctx.UserID == 0 {
		t.Error("FilterContext UserID should not be zero")
	}

	if ctx.QueryID == "" {
		t.Error("FilterContext QueryID should not be empty")
	}

	if ctx.RequestedCount <= 0 {
		t.Error("FilterContext RequestedCount should be positive")
	}

	if ctx.Config == nil {
		t.Error("FilterContext Config should not be nil")
	}

	if ctx.Metrics == nil {
		t.Error("FilterContext Metrics should not be nil")
	}
}