package svggen

import (
	"os"
	"testing"
)

func TestConvertOrangeSVGToPNG(t *testing.T) {
	// Read the orange SVG file
	orangeSVGPath := "ori.svg"
	svgData, err := os.ReadFile(orangeSVGPath)
	if err != nil {
		t.Fatalf("Failed to read orange SVG file: %v", err)
	}

	t.Logf("📁 Read orange SVG file: %s", orangeSVGPath)
	t.Logf("📏 SVG file size: %d bytes", len(svgData))

	// Extract dimensions from the SVG
	width, height := extractSVGDimensions(string(svgData))
	t.Logf("📐 Extracted dimensions: %dx%d", width, height)

	// Convert SVG to PNG
	pngData, err := ConvertSVGToPNG(svgData)
	if err != nil {
		t.Fatalf("ConvertSVGToPNG failed: %v", err)
	}

	t.Logf("✅ Successfully converted orange SVG to PNG")
	t.Logf("📏 PNG size: %d bytes", len(pngData))

	// Write PNG to file for inspection
	outputFile := "橙子_converted.png"
	err = os.WriteFile(outputFile, pngData, 0644)
	if err != nil {
		t.Fatalf("Failed to write PNG file: %v", err)
	}

	t.Logf("💾 Saved converted PNG as: %s", outputFile)
	t.Log("🔍 You can open this file to see the converted result")
	t.Log("ℹ️  Note: The PNG will be a white rectangle with the same dimensions as the SVG")
	t.Log("   since we don't have full SVG rendering capability yet.")
}

func TestDimensionExtractionFromOrangeSVG(t *testing.T) {
	// Read the orange SVG file
	svgData, err := os.ReadFile("橙子.svg")
	if err != nil {
		t.Fatalf("Failed to read orange SVG file: %v", err)
	}

	// Test dimension extraction
	width, height := extractSVGDimensions(string(svgData))

	t.Logf("Extracted dimensions from orange SVG:")
	t.Logf("  Width: %d", width)
	t.Logf("  Height: %d", height)

	// The orange SVG has: width="1024" height="1024"
	expectedWidth := 1024
	expectedHeight := 1024

	if width != expectedWidth {
		t.Errorf("Expected width %d, got %d", expectedWidth, width)
	}

	if height != expectedHeight {
		t.Errorf("Expected height %d, got %d", expectedHeight, height)
	}
}

func TestShowOrangeSVGContent(t *testing.T) {
	// Read and analyze the orange SVG
	svgData, err := os.ReadFile("橙子.svg")
	if err != nil {
		t.Fatalf("Failed to read orange SVG file: %v", err)
	}

	svgContent := string(svgData)

	t.Log("🍊 Orange SVG Analysis:")
	t.Logf("📄 Total length: %d characters", len(svgContent))

	// Count some SVG elements
	pathCount := 0
	start := 0
	for {
		index := findSubstring(svgContent[start:], "<path")
		if index == -1 {
			break
		}
		pathCount++
		start += index + 5
	}

	t.Logf("🎨 Number of <path> elements: %d", pathCount)

	// Look for gradient definitions
	hasGradient := findSubstring(svgContent, "<linearGradient") != -1
	t.Logf("🌈 Has gradients: %t", hasGradient)

	// Look for colors
	hasOrange := findSubstring(svgContent, "rgb(245,144,64)") != -1
	hasBrown := findSubstring(svgContent, "rgb(89,33,33)") != -1

	t.Logf("🟠 Has orange color: %t", hasOrange)
	t.Logf("🟤 Has brown color: %t", hasBrown)
}

// Helper function to find substring (like strings.Index)
func findSubstring(s, substr string) int {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}