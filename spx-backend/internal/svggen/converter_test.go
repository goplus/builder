package svggen

import (
	"os"
	"testing"
)

func TestConvertSVGToPNG_WithProblematicSVG(t *testing.T) {
	// Read the problematic SVG file that was causing the error
	svgData, err := os.ReadFile("橙子.svg")
	if err != nil {
		t.Skipf("Test SVG file not found: %v", err)
		return
	}

	// Test the conversion
	pngData, err := ConvertSVGToPNG(svgData)
	if err != nil {
		t.Fatalf("ConvertSVGToPNG failed: %v", err)
	}

	if len(pngData) == 0 {
		t.Fatal("PNG data is empty")
	}

	// Verify PNG header (first 8 bytes should be PNG signature)
	expectedPNGHeader := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
	if len(pngData) < 8 {
		t.Fatal("PNG data too short")
	}

	for i := 0; i < 8; i++ {
		if pngData[i] != expectedPNGHeader[i] {
			t.Fatalf("Invalid PNG header at position %d: got %x, want %x", i, pngData[i], expectedPNGHeader[i])
		}
	}

	t.Logf("Successfully converted SVG to PNG, size: %d bytes", len(pngData))
}

func TestPreprocessSVG(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "replace preserveAspectRatio none",
			input:    `<svg preserveAspectRatio="none">`,
			expected: `<svg preserveAspectRatio="xMidYMid meet">`,
		},
		{
			name:     "replace fill none",
			input:    `<path fill="none">`,
			expected: `<path fill="transparent">`,
		},
		{
			name:     "replace stroke none",
			input:    `<path stroke="none">`,
			expected: `<path stroke="transparent">`,
		},
		{
			name:     "fix gradient stop elements",
			input:    `<stop class="stop0" offset="0" stop-opacity="1" stop-color="rgb(233,188,172)"/>`,
			expected: `<stop offset="0" opacity="1" stop-color="rgb(233,188,172)"/>`,
		},
		{
			name:     "fix gradient stop1 elements",
			input:    `<stop class="stop1" offset="1" stop-opacity="1" stop-color="rgb(225,204,191)"/>`,
			expected: `<stop offset="1" opacity="1" stop-color="rgb(225,204,191)"/>`,
		},
		{
			name:     "multiple replacements",
			input:    `<svg preserveAspectRatio="none"><path fill="none" stroke="none">`,
			expected: `<svg preserveAspectRatio="xMidYMid meet"><path fill="transparent" stroke="transparent">`,
		},
		{
			name:     "fix stroke attributes with none values",
			input:    `<g stroke-width="none" stroke-linecap="none" stroke-linejoin="none">`,
			expected: `<g stroke-width="0" stroke-linecap="butt" stroke-linejoin="miter">`,
		},
		{
			name:     "fix font attributes with none values",
			input:    `<text font-family="none" font-weight="none" font-size="none" text-anchor="none">`,
			expected: `<text>`,
		},
		{
			name:     "remove empty and default stroke attributes",
			input:    `<path stroke-dasharray="" stroke-dashoffset="0">`,
			expected: `<path>`,
		},
		{
			name:     "no changes needed",
			input:    `<svg><path fill="red">`,
			expected: `<svg><path fill="red">`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := preprocessSVG([]byte(tt.input))
			if string(result) != tt.expected {
				t.Errorf("preprocessSVG() = %q, want %q", string(result), tt.expected)
			}
		})
	}
}