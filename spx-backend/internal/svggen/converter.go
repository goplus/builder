package svggen

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/srwiley/oksvg"
	"github.com/srwiley/rasterx"
)

// ConvertSVGToPNG converts SVG data to PNG format
func ConvertSVGToPNG(svgData []byte) ([]byte, error) {
	// First try with external tools if available
	if pngData, err := convertSVGToPNGViaExternalTool(svgData); err == nil {
		return pngData, nil
	}

	// Fall back to oksvg approach
	return convertSVGToPNGViaOksvg(svgData)
}

// convertSVGToPNGViaOksvg uses the oksvg library (original method)
func convertSVGToPNGViaOksvg(svgData []byte) ([]byte, error) {
	// Preprocess SVG to handle problematic values like "none"
	cleanedSVG := preprocessSVG(svgData)

	// Parse SVG
	icon, err := oksvg.ReadIconStream(bytes.NewReader(cleanedSVG))
	if err != nil {
		// If oksvg parsing fails, fall back to creating a placeholder image
		return createPlaceholderPNG(svgData)
	}

	// Get dimensions from SVG or use defaults
	width, height := 512, 512
	if icon.ViewBox.W > 0 && icon.ViewBox.H > 0 {
		width = int(icon.ViewBox.W)
		height = int(icon.ViewBox.H)
	}

	// Limit maximum size to prevent memory issues
	maxSize := 2048
	if width > maxSize {
		height = height * maxSize / width
		width = maxSize
	}
	if height > maxSize {
		width = width * maxSize / height
		height = maxSize
	}

	// Create image
	img := image.NewRGBA(image.Rect(0, 0, width, height))

	// Create scanner and rasterizer
	scanner := rasterx.NewScannerGV(width, height, img, img.Bounds())
	raster := rasterx.NewDasher(width, height, scanner)

	// Set the size
	icon.SetTarget(0, 0, float64(width), float64(height))

	// Render SVG to image
	icon.Draw(raster, 1.0)

	// Encode to PNG
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, fmt.Errorf("failed to encode PNG: %w", err)
	}

	return buf.Bytes(), nil
}

// extractSVGDimensions tries to extract width and height from SVG content
func extractSVGDimensions(svgContent string) (int, int) {
	var width, height int = 512, 512 // defaults

	// Look for width and height attributes in the SVG tag
	svgTag := ""
	if start := strings.Index(svgContent, "<svg"); start != -1 {
		if end := strings.Index(svgContent[start:], ">"); end != -1 {
			svgTag = svgContent[start : start+end+1]
		}
	}

	if svgTag != "" {
		// Simple parsing for width and height
		if widthStart := strings.Index(svgTag, `width="`); widthStart != -1 {
			widthStart += 7
			if widthEnd := strings.Index(svgTag[widthStart:], `"`); widthEnd != -1 {
				if w, err := parseSize(svgTag[widthStart : widthStart+widthEnd]); err == nil {
					width = w
				}
			}
		}

		if heightStart := strings.Index(svgTag, `height="`); heightStart != -1 {
			heightStart += 8
			if heightEnd := strings.Index(svgTag[heightStart:], `"`); heightEnd != -1 {
				if h, err := parseSize(svgTag[heightStart : heightStart+heightEnd]); err == nil {
					height = h
				}
			}
		}
	}

	return width, height
}

// parseSize converts a size string (like "100px", "100") to integer
func parseSize(sizeStr string) (int, error) {
	// Remove common units
	sizeStr = strings.TrimSuffix(sizeStr, "px")
	sizeStr = strings.TrimSuffix(sizeStr, "pt")
	sizeStr = strings.TrimSpace(sizeStr)

	var size int
	if _, err := fmt.Sscanf(sizeStr, "%d", &size); err != nil {
		return 0, err
	}

	return size, nil
}

// preprocessSVG cleans up SVG content to handle problematic values that cause parsing errors
func preprocessSVG(svgData []byte) []byte {
	content := string(svgData)

	// Replace problematic "none" values in preserveAspectRatio with a valid value
	content = strings.ReplaceAll(content, `preserveAspectRatio="none"`, `preserveAspectRatio="xMidYMid meet"`)

	// Handle stroke and fill "none" values
	content = strings.ReplaceAll(content, `fill="none"`, `fill="transparent"`)
	content = strings.ReplaceAll(content, `stroke="none"`, `stroke="transparent"`)

	// Handle stroke attributes with "none" values that cause param mismatch
	content = strings.ReplaceAll(content, `stroke-width="none"`, `stroke-width="0"`)
	content = strings.ReplaceAll(content, `stroke-linecap="none"`, `stroke-linecap="butt"`)
	content = strings.ReplaceAll(content, `stroke-linejoin="none"`, `stroke-linejoin="miter"`)
	content = strings.ReplaceAll(content, ` stroke-dasharray=""`, ``)
	content = strings.ReplaceAll(content, ` stroke-dashoffset="0"`, ``)

	// Remove potentially problematic attributes that oksvg might not handle well
	content = strings.ReplaceAll(content, ` fill-rule="nonzero"`, ``)
	content = strings.ReplaceAll(content, ` stroke-miterlimit="10"`, ``)
	content = strings.ReplaceAll(content, ` style="mix-blend-mode: normal"`, ``)
	content = strings.ReplaceAll(content, ` fill-opacity="0"`, ``)
	content = strings.ReplaceAll(content, ` visibility="hidden"`, ``)

	// Handle font attributes with "none" values
	content = strings.ReplaceAll(content, ` font-family="none"`, ``)
	content = strings.ReplaceAll(content, ` font-weight="none"`, ``)
	content = strings.ReplaceAll(content, ` font-size="none"`, ``)
	content = strings.ReplaceAll(content, ` text-anchor="none"`, ``)

	// Fix gradient stop elements
	content = strings.ReplaceAll(content, ` class="stop0"`, ``)
	content = strings.ReplaceAll(content, ` class="stop1"`, ``)
	content = strings.ReplaceAll(content, `stop-opacity="`, `opacity="`)

	// Apply aggressive path data cleaning
	content = aggressivePathCleaning(content)

	return []byte(content)
}

// cleanPathData cleans up potentially problematic path data
func cleanPathData(content string) string {
	// Fix multiple consecutive h/v commands that might confuse the parser
	// Replace patterns like "h-12h-12h-10" with proper spacing
	re := regexp.MustCompile(`([hvHV])([-+]?\d+(?:\.\d+)?)([hvHV])`)
	for re.MatchString(content) {
		content = re.ReplaceAllString(content, "${1}${2} ${3}")
	}

	// Fix patterns where commands are too close together without proper spacing
	re2 := regexp.MustCompile(`([hvHVlLmMcCsSzZqQtTaA])([-+]?\d+(?:\.\d+)?)([hvHVlLmMcCsSzZqQtTaA])`)
	for re2.MatchString(content) {
		content = re2.ReplaceAllString(content, "${1}${2} ${3}")
	}

	return content
}

// aggressivePathCleaning applies more thorough cleaning to path data
func aggressivePathCleaning(content string) string {
	// First apply the regular path cleaning
	content = cleanPathData(content)

	// Convert all relative commands to absolute commands for better compatibility
	content = convertRelativeToAbsolutePaths(content)

	return content
}

// convertRelativeToAbsolutePaths converts relative path commands to absolute ones
func convertRelativeToAbsolutePaths(content string) string {
	// For simplicity, we'll clean up path data to be more compatible with oksvg
	pathRegex := regexp.MustCompile(`d="([^"]*)"`)

	content = pathRegex.ReplaceAllStringFunc(content, func(match string) string {
		pathData := match[3 : len(match)-1] // Extract path data between quotes

		// Ensure proper spacing around commands
		commandRegex := regexp.MustCompile(`([MmLlHhVvCcSsQqTtAaZz])`)
		pathData = commandRegex.ReplaceAllString(pathData, " $1 ")

		// Clean up multiple spaces and normalize
		spaceRegex := regexp.MustCompile(`\s+`)
		pathData = spaceRegex.ReplaceAllString(pathData, " ")
		pathData = strings.TrimSpace(pathData)

		// Ensure space after commas for better parsing
		commaRegex := regexp.MustCompile(`,(\S)`)
		pathData = commaRegex.ReplaceAllString(pathData, ", $1")

		return `d="` + pathData + `"`
	})

	return content
}

// createPlaceholderPNG creates a simple placeholder PNG when SVG parsing fails
func createPlaceholderPNG(svgData []byte) ([]byte, error) {
	// Extract dimensions from SVG content or use defaults
	width, height := extractSVGDimensions(string(svgData))

	// Limit maximum size to prevent memory issues
	maxSize := 2048
	if width > maxSize {
		height = height * maxSize / width
		width = maxSize
	}
	if height > maxSize {
		width = width * maxSize / height
		height = maxSize
	}

	// Create a simple white image as placeholder
	img := image.NewRGBA(image.Rect(0, 0, width, height))

	// Fill with white background
	white := color.RGBA{255, 255, 255, 255}
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			img.Set(x, y, white)
		}
	}

	// Encode to PNG
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, fmt.Errorf("failed to encode placeholder PNG: %w", err)
	}

	return buf.Bytes(), nil
}

// convertSVGToPNGViaExternalTool tries to use external tools like rsvg-convert or inkscape
func convertSVGToPNGViaExternalTool(svgData []byte) ([]byte, error) {
	// Extract dimensions for proper scaling
	width, height := extractSVGDimensions(string(svgData))

	// Try rsvg-convert first (most common on Linux servers)
	if pngData, err := tryRsvgConvert(svgData, width, height); err == nil {
		return pngData, nil
	}

	// Try inkscape as fallback
	if pngData, err := tryInkscape(svgData, width, height); err == nil {
		return pngData, nil
	}

	// Try ImageMagick convert
	if pngData, err := tryImageMagick(svgData, width, height); err == nil {
		return pngData, nil
	}

	return nil, fmt.Errorf("no external SVG conversion tools available")
}

// tryRsvgConvert attempts to use rsvg-convert
func tryRsvgConvert(svgData []byte, width, height int) ([]byte, error) {
	// Check if rsvg-convert is available
	if _, err := exec.LookPath("rsvg-convert"); err != nil {
		return nil, fmt.Errorf("rsvg-convert not found")
	}

	return runExternalConverter("rsvg-convert", svgData, width, height, []string{
		"-f", "png",
		"-w", fmt.Sprintf("%d", width),
		"-h", fmt.Sprintf("%d", height),
	})
}

// tryInkscape attempts to use inkscape
func tryInkscape(svgData []byte, width, height int) ([]byte, error) {
	// Check if inkscape is available
	if _, err := exec.LookPath("inkscape"); err != nil {
		return nil, fmt.Errorf("inkscape not found")
	}

	return runExternalConverter("inkscape", svgData, width, height, []string{
		"--export-type=png",
		fmt.Sprintf("--export-width=%d", width),
		fmt.Sprintf("--export-height=%d", height),
		"--export-filename=-", // Output to stdout
		"-", // Read from stdin
	})
}

// tryImageMagick attempts to use ImageMagick convert
func tryImageMagick(svgData []byte, width, height int) ([]byte, error) {
	// Check if convert is available
	if _, err := exec.LookPath("convert"); err != nil {
		return nil, fmt.Errorf("imagemagick convert not found")
	}

	return runExternalConverter("convert", svgData, width, height, []string{
		"-density", "300", // High DPI for better quality
		"-resize", fmt.Sprintf("%dx%d", width, height),
		"svg:-", // Read SVG from stdin
		"png:-", // Output PNG to stdout
	})
}

// runExternalConverter runs an external tool to convert SVG to PNG
func runExternalConverter(command string, svgData []byte, width, height int, args []string) ([]byte, error) {
	// Create a temporary file for the SVG if the tool doesn't support stdin
	needsTempFile := command == "inkscape" && len(args) > 0

	var cmd *exec.Cmd
	if needsTempFile {
		// Create temporary file
		tempDir := os.TempDir()
		svgFile := filepath.Join(tempDir, fmt.Sprintf("temp_%d.svg", time.Now().UnixNano()))
		pngFile := filepath.Join(tempDir, fmt.Sprintf("temp_%d.png", time.Now().UnixNano()))

		// Write SVG to temp file
		if err := os.WriteFile(svgFile, svgData, 0644); err != nil {
			return nil, fmt.Errorf("failed to write temp SVG file: %w", err)
		}
		defer os.Remove(svgFile)
		defer os.Remove(pngFile)

		// Modify args to use temp files
		finalArgs := []string{
			"--export-type=png",
			fmt.Sprintf("--export-width=%d", width),
			fmt.Sprintf("--export-height=%d", height),
			fmt.Sprintf("--export-filename=%s", pngFile),
			svgFile,
		}

		cmd = exec.Command(command, finalArgs...)
		if err := cmd.Run(); err != nil {
			return nil, fmt.Errorf("external tool failed: %w", err)
		}

		// Read the output PNG file
		return os.ReadFile(pngFile)
	} else {
		// Use stdin/stdout
		cmd = exec.Command(command, args...)
		cmd.Stdin = bytes.NewReader(svgData)

		output, err := cmd.Output()
		if err != nil {
			return nil, fmt.Errorf("external tool failed: %w", err)
		}

		return output, nil
	}
}