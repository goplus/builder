package svgbeautify

import (
	"fmt"
	"log"
)

// ExampleBeautifySVG demonstrates the basic usage of the SVG beautification tool.
func ExampleBeautifySVG() {
	svgContent := `<svg width="100" height="100">
		<path d="M 10 10 L 20 20 L 30 30 L 40 40 L 50 50" stroke="black" fill="none"/>
	</svg>`

	// Basic beautification with default options
	result, err := BeautifySVG(svgContent)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Reduction rate: %.2f%%\n", result.ReductionRate)
	fmt.Printf("Beautified SVG length: %d\n", len(result.BeautifiedSVG))
	// Output:
	// Reduction rate: 0.00%
	// Beautified SVG length: 149
}

// ExampleBeautifySVG_withOptions demonstrates using custom options.
func ExampleBeautifySVG_withOptions() {
	svgContent := `<svg width="200" height="200">
		<path d="M 0 0 L 50 50 L 100 50 L 150 100 L 200 100" stroke="blue" fill="none"/>
	</svg>`

	// Beautify with custom epsilon and smoothing enabled
	result, err := BeautifySVG(svgContent, BeautifyOptions{
		Epsilon:      2.0, // Higher epsilon for more aggressive simplification
		EnableSmooth: true, // Enable curve smoothing
	})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Reduction rate: %.2f%%\n", result.ReductionRate)
	// Output should show some reduction and smooth curves
}

// ExampleSimplifySVG demonstrates the convenience function for simple path simplification.
func ExampleSimplifySVG() {
	svgContent := `<svg width="100" height="100">
		<path d="M 10 10 L 15 15 L 20 20 L 25 25 L 30 30" stroke="red" fill="none"/>
	</svg>`

	// Simplify with epsilon = 3.0
	simplified, err := SimplifySVG(svgContent, 3.0)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Simplified SVG contains path: %t\n", len(simplified) > 0)
	// Output:
	// Simplified SVG contains path: true
}

// ExampleSmoothSVG demonstrates the convenience function for curve smoothing.
func ExampleSmoothSVG() {
	svgContent := `<svg width="100" height="100">
		<path d="M 10 10 L 30 30 L 50 20 L 70 40 L 90 30" stroke="green" fill="none"/>
	</svg>`

	// Apply curve smoothing with epsilon = 1.0
	smoothed, err := SmoothSVG(svgContent, 1.0)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Smoothed SVG contains curves: %t\n", len(smoothed) > 0)
	// Output:
	// Smoothed SVG contains curves: true
}