package controller

import (
	"testing"
	"strings"
)

// TestGenerateQueryID tests that generateQueryID produces valid UUIDs
func TestGenerateQueryID(t *testing.T) {
	// Generate multiple query IDs to test uniqueness
	ids := make(map[string]bool)

	for i := 0; i < 100; i++ {
		queryID := generateQueryID()

		// Test basic format
		if queryID == "" {
			t.Error("Generated queryID should not be empty")
		}

		// UUID should be 36 characters with hyphens
		if len(queryID) != 36 {
			t.Errorf("QueryID should be 36 characters, got %d: %s", len(queryID), queryID)
		}

		// Should contain hyphens in UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
		if !strings.Contains(queryID, "-") {
			t.Errorf("QueryID should be UUID format with hyphens: %s", queryID)
		}

		// Count hyphens (should be 4 in a proper UUID)
		hyphenCount := strings.Count(queryID, "-")
		if hyphenCount != 4 {
			t.Errorf("QueryID should have 4 hyphens, got %d: %s", hyphenCount, queryID)
		}

		// Test uniqueness
		if ids[queryID] {
			t.Errorf("Generated duplicate queryID: %s", queryID)
		}
		ids[queryID] = true
	}

	t.Logf("✅ Generated %d unique query IDs successfully", len(ids))
}

// TestQueryIDFormat tests the specific format of generated query IDs
func TestQueryIDFormat(t *testing.T) {
	queryID := generateQueryID()

	// Split by hyphens and check segment lengths
	parts := strings.Split(queryID, "-")
	if len(parts) != 5 {
		t.Errorf("QueryID should have 5 parts separated by hyphens, got %d: %s", len(parts), queryID)
	}

	// Check the length of each segment (UUID v4 format: 8-4-4-4-12)
	expectedLengths := []int{8, 4, 4, 4, 12}
	for i, part := range parts {
		if len(part) != expectedLengths[i] {
			t.Errorf("QueryID segment %d should be %d characters, got %d: %s",
				i+1, expectedLengths[i], len(part), queryID)
		}

		// All characters should be hexadecimal
		for _, char := range part {
			if !((char >= '0' && char <= '9') || (char >= 'a' && char <= 'f') || (char >= 'A' && char <= 'F')) {
				t.Errorf("QueryID contains non-hex character '%c': %s", char, queryID)
			}
		}
	}

	t.Logf("✅ QueryID format verified: %s", queryID)
}