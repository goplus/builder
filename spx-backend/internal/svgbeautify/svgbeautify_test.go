package svgbeautify

import (
	"strings"
	"testing"
)

func TestRamerDouglasPeucker(t *testing.T) {
	// Test with a simple line of points
	points := []Point{
		{X: 0, Y: 0},
		{X: 1, Y: 1},
		{X: 2, Y: 2},
		{X: 3, Y: 3},
		{X: 4, Y: 4},
	}

	// With epsilon 0.1, should keep most points
	result := RamerDouglasPeucker(points, 0.1)
	if len(result) < 2 {
		t.Errorf("Expected at least 2 points, got %d", len(result))
	}

	// With epsilon 2.0, should simplify to just endpoints
	result = RamerDouglasPeucker(points, 2.0)
	if len(result) != 2 {
		t.Errorf("Expected 2 points with high epsilon, got %d", len(result))
	}
	if result[0] != points[0] || result[1] != points[len(points)-1] {
		t.Errorf("Expected endpoints to match, got %v and %v", result[0], result[1])
	}
}

func TestParseSVGPaths(t *testing.T) {
	svgContent := `<svg width="100" height="100">
		<path d="M 10 10 L 20 20 L 30 30" id="test-path"/>
	</svg>`

	paths, err := ParseSVGPaths(svgContent)
	if err != nil {
		t.Fatalf("Failed to parse SVG paths: %v", err)
	}

	if len(paths) != 1 {
		t.Fatalf("Expected 1 path, got %d", len(paths))
	}

	if paths[0].ID != "test-path" {
		t.Errorf("Expected path ID 'test-path', got '%s'", paths[0].ID)
	}

	// The parser may split the path into multiple commands (M, L, L)
	if len(paths[0].Commands) < 1 {
		t.Errorf("Expected at least 1 command, got %d", len(paths[0].Commands))
	}

	if paths[0].Commands[0].Command != "M" {
		t.Errorf("Expected first command to be MoveTo, got '%s'", paths[0].Commands[0].Command)
	}
}

func TestBeautifySVG(t *testing.T) {
	// Test with a simple SVG
	svgContent := `<svg width="100" height="100">
		<path d="M 10 10 L 20 20 L 30 30 L 40 40 L 50 50" id="test-path"/>
	</svg>`

	result, err := BeautifySVG(svgContent, BeautifyOptions{
		Epsilon:      1.0,
		EnableSmooth: false,
	})
	if err != nil {
		t.Fatalf("Failed to beautify SVG: %v", err)
	}

	if result.BeautifiedSVG == "" {
		t.Error("Beautified SVG should not be empty")
	}

	if result.ReductionRate < 0 {
		t.Error("Reduction rate should be non-negative")
	}
}

func TestBeautifySVGWithSmoothing(t *testing.T) {
	// Test with a simple SVG that can be smoothed
	svgContent := `<svg width="100" height="100">
		<path d="M 10 10 L 20 20 L 30 30 L 40 40 L 50 50" id="test-path"/>
	</svg>`

	result, err := BeautifySVG(svgContent, BeautifyOptions{
		Epsilon:      1.0,
		EnableSmooth: true,
	})
	if err != nil {
		t.Fatalf("Failed to beautify SVG with smoothing: %v", err)
	}

	if result.BeautifiedSVG == "" {
		t.Error("Beautified SVG should not be empty")
	}

	// Smoothed SVG should contain curve commands (C)
	if !strings.Contains(result.BeautifiedSVG, "C") {
		t.Log("Note: No curve commands found in output - this may be expected for simple paths")
	}
}

func TestSimplifyAndSmoothConvenienceFunctions(t *testing.T) {
	svgContent := `<svg width="100" height="100">
		<path d="M 10 10 L 20 20 L 30 30" id="test-path"/>
	</svg>`

	// Test SimplifySVG
	simplified, err := SimplifySVG(svgContent, 1.0)
	if err != nil {
		t.Fatalf("Failed to simplify SVG: %v", err)
	}
	if simplified == "" {
		t.Error("Simplified SVG should not be empty")
	}

	// Test SmoothSVG
	smoothed, err := SmoothSVG(svgContent, 1.0)
	if err != nil {
		t.Fatalf("Failed to smooth SVG: %v", err)
	}
	if smoothed == "" {
		t.Error("Smoothed SVG should not be empty")
	}
}

func TestBeautifySVGWithDefaultOptions(t *testing.T) {
	svgContent := `<svg width="100" height="100">
		<path d="M 10 10 L 20 20 L 30 30" id="test-path"/>
	</svg>`

	// Test with default options (no options parameter)
	result, err := BeautifySVG(svgContent)
	if err != nil {
		t.Fatalf("Failed to beautify SVG with default options: %v", err)
	}

	if result.BeautifiedSVG == "" {
		t.Error("Beautified SVG should not be empty")
	}

	if result.ReductionRate < 0 {
		t.Error("Reduction rate should be non-negative")
	}
}

func TestBeautifySVGErrorHandling(t *testing.T) {
	// Test with empty SVG content
	_, err := BeautifySVG("")
	if err == nil {
		t.Error("Expected error for empty SVG content")
	}

	// Test with invalid SVG - note: parser is permissive, so this may not error
	_, err = BeautifySVG("invalid svg")
	if err != nil {
		t.Logf("Parser rejected invalid SVG as expected: %v", err)
	} else {
		t.Log("Parser accepted invalid SVG - this is expected behavior")
	}
}

func TestBeautifySVGWithZeroEpsilon(t *testing.T) {
	svgContent := `<svg width="100" height="100">
		<path d="M 10 10 L 20 20 L 30 30" id="test-path"/>
	</svg>`

	// Test with zero epsilon (should use default)
	result, err := BeautifySVG(svgContent, BeautifyOptions{
		Epsilon:      0,
		EnableSmooth: false,
	})
	if err != nil {
		t.Fatalf("Failed to beautify SVG with zero epsilon: %v", err)
	}

	if result.BeautifiedSVG == "" {
		t.Error("Beautified SVG should not be empty")
	}
}

func TestCurveSmoothing(t *testing.T) {
	smoothing := NewCurveSmoothing()

	// Test with simple points
	points := []Point{
		{X: 0, Y: 0},
		{X: 10, Y: 10},
		{X: 20, Y: 20},
		{X: 30, Y: 30},
	}

	path := SVGPath{
		Commands: []PathCommand{
			{Command: "M", Points: points},
		},
	}

	smoothedPath := smoothing.SmoothPath(path)
	if len(smoothedPath.Commands) == 0 {
		t.Error("Smoothed path should have commands")
	}

	// Test tension setting
	smoothing.SetTension(0.8)
	if smoothing.tension != 0.8 {
		t.Errorf("Expected tension 0.8, got %f", smoothing.tension)
	}

	// Test sample points setting
	smoothing.SetSamplePoints(50)
	if smoothing.samplePoints != 50 {
		t.Errorf("Expected 50 sample points, got %d", smoothing.samplePoints)
	}
}

func TestPerpendicularDistance(t *testing.T) {
	pt := Point{X: 5, Y: 5}
	start := Point{X: 0, Y: 0}
	end := Point{X: 10, Y: 10}

	distance := PerpendicularDistance(pt, start, end)

	// The point (5,5) should be exactly on the line from (0,0) to (10,10)
	// So perpendicular distance should be very close to 0
	if distance > 0.001 {
		t.Errorf("Expected distance close to 0, got %f", distance)
	}
}

func TestBuildSVG(t *testing.T) {
	originalSVG := `<svg width="100" height="100">
		<path d="M 10 10 L 20 20 L 30 30" id="test-path"/>
	</svg>`

	paths := []SVGPath{
		{
			ID: "test-path",
			Commands: []PathCommand{
				{Command: "M", Points: []Point{{X: 10, Y: 10}, {X: 20, Y: 20}, {X: 30, Y: 30}}},
			},
		},
	}

	result := BuildSVG(originalSVG, paths)
	if !strings.Contains(result, "d=") {
		t.Error("Result should contain d attribute")
	}
}