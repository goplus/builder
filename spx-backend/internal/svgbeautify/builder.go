package svgbeautify

import (
	"fmt"
	"regexp"
	"strings"
)

// BuildSVG reconstructs SVG content with beautified paths.
func BuildSVG(originalSVG string, beautifiedPaths []SVGPath) string {
	result := originalSVG

	// Regular expression to match path elements
	pathRegex := regexp.MustCompile(`<path[^>]*\sd\s*=\s*"[^"]*"[^>]*>`)

	pathIndex := 0
	result = pathRegex.ReplaceAllStringFunc(result, func(match string) string {
		if pathIndex < len(beautifiedPaths) {
			newPath := buildPathElement(match, beautifiedPaths[pathIndex])
			pathIndex++
			return newPath
		}
		return match
	})

	return result
}

// buildPathElement reconstructs a path element with new d attribute.
func buildPathElement(originalElement string, path SVGPath) string {
	// Extract the opening tag and its attributes
	pathData := buildPathData(path.Commands)

	// Regular expression to find and replace the d attribute
	dAttrRegex := regexp.MustCompile(`\sd\s*=\s*"[^"]*"`)

	newElement := dAttrRegex.ReplaceAllString(originalElement, fmt.Sprintf(` d="%s"`, pathData))

	return newElement
}

// buildPathData converts path commands back to SVG path data string.
func buildPathData(commands []PathCommand) string {
	var parts []string

	for _, cmd := range commands {
		switch cmd.Command {
		case "Z", "z":
			parts = append(parts, cmd.Command)
		case "M", "L":
			if len(cmd.Points) > 0 {
				// 使用紧凑格式 - 首个点用命令字母，后续点省略命令字母
				cmdStr := cmd.Command
				for i, point := range cmd.Points {
					if i == 0 {
						parts = append(parts, fmt.Sprintf("%s%s", cmdStr, formatPoint(point)))
					} else {
						// 连续的线段点可以省略L命令
						parts = append(parts, formatPoint(point))
					}
				}
			}
		case "H":
			for i, point := range cmd.Points {
				if i == 0 {
					parts = append(parts, fmt.Sprintf("%s%s", cmd.Command, formatNumber(point.X)))
				} else {
					parts = append(parts, formatNumber(point.X))
				}
			}
		case "V":
			for i, point := range cmd.Points {
				if i == 0 {
					parts = append(parts, fmt.Sprintf("%s%s", cmd.Command, formatNumber(point.Y)))
				} else {
					parts = append(parts, formatNumber(point.Y))
				}
			}
		case "C":
			// Cubic Bezier - should have points in groups of 3
			for i := 0; i < len(cmd.Points); i += 3 {
				if i+2 < len(cmd.Points) {
					if i == 0 {
						parts = append(parts, fmt.Sprintf("%s%s %s %s",
							cmd.Command,
							formatPoint(cmd.Points[i]),
							formatPoint(cmd.Points[i+1]),
							formatPoint(cmd.Points[i+2])))
					} else {
						parts = append(parts, fmt.Sprintf("%s %s %s",
							formatPoint(cmd.Points[i]),
							formatPoint(cmd.Points[i+1]),
							formatPoint(cmd.Points[i+2])))
					}
				}
			}
		case "S":
			// Smooth Cubic Bezier - should have points in groups of 2
			for i := 0; i < len(cmd.Points); i += 2 {
				if i+1 < len(cmd.Points) {
					if i == 0 {
						parts = append(parts, fmt.Sprintf("%s%s%s",
							cmd.Command,
							formatPoint(cmd.Points[i]),
							formatPoint(cmd.Points[i+1])))
					} else {
						parts = append(parts, fmt.Sprintf("%s%s",
							formatPoint(cmd.Points[i]),
							formatPoint(cmd.Points[i+1])))
					}
				}
			}
		case "Q":
			// Quadratic Bezier - should have points in groups of 2
			for i := 0; i < len(cmd.Points); i += 2 {
				if i+1 < len(cmd.Points) {
					if i == 0 {
						parts = append(parts, fmt.Sprintf("%s%s%s",
							cmd.Command,
							formatPoint(cmd.Points[i]),
							formatPoint(cmd.Points[i+1])))
					} else {
						parts = append(parts, fmt.Sprintf("%s%s",
							formatPoint(cmd.Points[i]),
							formatPoint(cmd.Points[i+1])))
					}
				}
			}
		case "T":
			// Smooth Quadratic Bezier - one point per command
			for i, point := range cmd.Points {
				if i == 0 {
					parts = append(parts, fmt.Sprintf("%s%s", cmd.Command, formatPoint(point)))
				} else {
					parts = append(parts, formatPoint(point))
				}
			}
		case "A":
			// Arc - should have points in groups of 7 (rx ry x-axis-rotation large-arc-flag sweep-flag x y)
			// For simplicity, we'll handle this as pairs and let the caller deal with the complexity
			for i := 0; i < len(cmd.Points); i += 7 {
				if i+6 < len(cmd.Points) {
					parts = append(parts, fmt.Sprintf("%s %.2f %.2f %.2f %.0f %.0f %.2f %.2f",
						cmd.Command,
						cmd.Points[i].X, cmd.Points[i].Y,     // rx, ry
						cmd.Points[i+2].X,                   // x-axis-rotation
						cmd.Points[i+3].X, cmd.Points[i+4].X, // flags
						cmd.Points[i+5].X, cmd.Points[i+5].Y)) // end point
				}
			}
		default:
			// For other commands, just append points
			for _, point := range cmd.Points {
				parts = append(parts, fmt.Sprintf("%s %.2f %.2f", cmd.Command, point.X, point.Y))
			}
		}
	}

	return strings.Join(parts, " ")
}

// formatPoint formats a point in a compact way
func formatPoint(p Point) string {
	return fmt.Sprintf("%s,%s", formatNumber(p.X), formatNumber(p.Y))
}

// formatNumber formats a number removing unnecessary decimals and leading zeros
func formatNumber(f float64) string {
	// 四舍五入到3位小数
	rounded := fmt.Sprintf("%.3f", f)

	// 移除尾部的0
	rounded = strings.TrimRight(rounded, "0")
	rounded = strings.TrimRight(rounded, ".")

	// 处理负数的情况，移除 -0
	if rounded == "-0" {
		rounded = "0"
	}

	return rounded
}

// CalculateReductionRate calculates the percentage of points removed.
func CalculateReductionRate(originalPaths, beautifiedPaths []SVGPath) float64 {
	originalCount := 0
	beautifiedCount := 0

	for _, path := range originalPaths {
		for _, cmd := range path.Commands {
			originalCount += len(cmd.Points)
		}
	}

	for _, path := range beautifiedPaths {
		for _, cmd := range path.Commands {
			beautifiedCount += len(cmd.Points)
		}
	}

	if originalCount == 0 {
		return 0
	}

	return float64(originalCount-beautifiedCount) / float64(originalCount) * 100
}