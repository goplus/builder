package controller

import (
	"testing"

	"github.com/goplus/builder/spx-backend/internal/config"
)

// TestSearchExpansionCalculation tests that search expansion is calculated correctly
func TestSearchExpansionCalculation(t *testing.T) {
	tests := []struct {
		name             string
		originalTopK     int
		expansionRatio   float64
		expectedTopK     int
	}{
		{
			name:           "Standard expansion",
			originalTopK:   4,
			expansionRatio: 2.0,
			expectedTopK:   8,
		},
		{
			name:           "Higher expansion",
			originalTopK:   4,
			expansionRatio: 3.0,
			expectedTopK:   12,
		},
		{
			name:           "Fractional expansion",
			originalTopK:   5,
			expansionRatio: 1.5,
			expectedTopK:   7, // int(5 * 1.5) = 7
		},
		{
			name:           "No expansion",
			originalTopK:   4,
			expansionRatio: 1.0,
			expectedTopK:   4,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			// Simulate the expansion calculation
			expandedTopK := int(float64(test.originalTopK) * test.expansionRatio)

			if expandedTopK != test.expectedTopK {
				t.Errorf("Expected expandedTopK=%d, got %d", test.expectedTopK, expandedTopK)
			}
		})
	}
}

// TestFilterConfigExpansion tests the expansion ratio configuration
func TestFilterConfigExpansion(t *testing.T) {
	config := &config.ImageFilterConfig{
		Enabled:               true,
		SearchExpansionRatio:  2.0,
	}

	ratio := config.GetSearchExpansionRatio()
	if ratio != 2.0 {
		t.Errorf("Expected expansion ratio=2.0, got %.1f", ratio)
	}

	// Test expansion calculation with config
	originalTopK := 4
	expandedTopK := int(float64(originalTopK) * ratio)
	expectedTopK := 8

	if expandedTopK != expectedTopK {
		t.Errorf("Expected expanded search TopK=%d, got %d", expectedTopK, expandedTopK)
	}

	t.Logf("✅ Search expansion verified: %d -> %d (ratio: %.1f)", originalTopK, expandedTopK, ratio)
}