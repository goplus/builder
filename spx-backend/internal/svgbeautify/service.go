package svgbeautify

import (
	"fmt"
	"strings"
)

// BeautifyOptions represents options for SVG beautification.
type BeautifyOptions struct {
	Epsilon        float64 // RDP simplification threshold (default: 1.0)
	EnableSmooth   bool    // Enable curve smoothing (default: false)
	PreSimplify    bool    // Pre-merge short segments (default: false)
	MinSegmentLen  float64 // Minimum segment length for pre-simplification (default: 2.0)
}

// BeautifyResult represents the result of SVG beautification.
type BeautifyResult struct {
	BeautifiedSVG string  // The beautified SVG content
	ReductionRate float64 // Percentage of points removed
}

// BeautifySVG beautifies an SVG by simplifying its paths using RDP algorithm and optional smoothing.
// This is the main entry point for the tool package.
func BeautifySVG(svgContent string, options ...BeautifyOptions) (*BeautifyResult, error) {
	if svgContent == "" {
		return nil, fmt.Errorf("svg content cannot be empty")
	}

	// Set default options with conservative parameter selection
	opts := BeautifyOptions{
		Epsilon:       3,  // 更保守的默认值，保护细节
		EnableSmooth:  false,
		PreSimplify:   true,  // 默认启用预简化
		MinSegmentLen: 1.0,   // 更小的合并阈值，保护小细节
	}
	if len(options) > 0 {
		opts = options[0]
		if opts.Epsilon <= 0 {
			opts.Epsilon = 0.5
		}
	}

	// 智能调整参数 - 更保守的策略
	originalSize := len(svgContent)
	if originalSize > 10000 {
		// 只有非常大的文件才使用更激进的简化
		opts.Epsilon = opts.Epsilon * 1.2
		opts.MinSegmentLen = opts.MinSegmentLen * 1.2
	} else if originalSize < 500 {
		// 小文件使用非常保守的简化
		opts.Epsilon = opts.Epsilon * 0.5
		opts.MinSegmentLen = opts.MinSegmentLen * 0.5
	}

	// Parse SVG paths - 检测复杂度并调整参数
	originalPaths, err := ParseSVGPaths(svgContent)
	if err != nil {
		return nil, fmt.Errorf("failed to parse SVG paths: %w", err)
	}

	// 检测可能的手绘或复杂图案 - 基于路径复杂度和曲线
	totalCommands := 0
	hasCurves := false
	hasHighDensityPaths := false

	for _, path := range originalPaths {
		totalCommands += len(path.Commands)

		// 检测是否包含曲线命令
		for _, cmd := range path.Commands {
			if cmd.Command == "C" || cmd.Command == "Q" || cmd.Command == "S" || cmd.Command == "T" || cmd.Command == "A" {
				hasCurves = true
			}
		}

		// 检测高密度路径（很多小线段组成的复杂形状）
		if len(path.Commands) > 30 {
			hasHighDensityPaths = true
		}
	}

	// 根据检测结果调整参数
	if hasCurves {
		// 包含真正的曲线，非常保守
		opts.Epsilon = opts.Epsilon * 0.3
	} else if hasHighDensityPaths {
		// 高密度路径（可能是手绘笑脸），保守处理
		opts.Epsilon = opts.Epsilon * 0.6
	} else if len(originalPaths) > 0 && totalCommands/len(originalPaths) > 20 {
		// 平均命令数较多，中等保守
		opts.Epsilon = opts.Epsilon * 0.8
	}

	if len(originalPaths) == 0 {
		return &BeautifyResult{
			BeautifiedSVG: svgContent,
			ReductionRate: 0,
		}, nil
	}

	// Simplify each path using RDP algorithm
	var beautifiedPaths []SVGPath
	for _, path := range originalPaths {
		processedPath := path

		// 预简化：合并短线段
		if opts.PreSimplify {
			processedPath = preSimplifyPath(path, opts.MinSegmentLen)
		}

		simplifiedPath := SimplifyPath(processedPath, opts.Epsilon)
		beautifiedPaths = append(beautifiedPaths, simplifiedPath)
	}

	// Apply curve smoothing if enabled
	if opts.EnableSmooth {
		smoothing := NewCurveSmoothing()
		for i, path := range beautifiedPaths {
			beautifiedPaths[i] = smoothing.SmoothPath(path)
		}
	}

	// Rebuild SVG with beautified paths
	beautifiedSVG := BuildSVG(svgContent, beautifiedPaths)

	// Calculate reduction rate
	reductionRate := CalculateReductionRate(originalPaths, beautifiedPaths)

	return &BeautifyResult{
		BeautifiedSVG: beautifiedSVG,
		ReductionRate: reductionRate,
	}, nil
}

// SimplifySVG simplifies an SVG with the given epsilon value.
// This is a convenience function for simple path simplification.
func SimplifySVG(svgContent string, epsilon float64) (string, error) {
	result, err := BeautifySVG(svgContent, BeautifyOptions{
		Epsilon:      epsilon,
		EnableSmooth: false,
	})
	if err != nil {
		return "", err
	}
	return result.BeautifiedSVG, nil
}

// SmoothSVG smooths an SVG with curve fitting.
// This is a convenience function for curve smoothing.
func SmoothSVG(svgContent string, epsilon float64) (string, error) {
	result, err := BeautifySVG(svgContent, BeautifyOptions{
		Epsilon:      epsilon,
		EnableSmooth: true,
	})
	if err != nil {
		return "", err
	}
	return result.BeautifiedSVG, nil
}

// preSimplifyPath merges short consecutive line segments.
func preSimplifyPath(path SVGPath, minLength float64) SVGPath {
	var newCommands []PathCommand

	for _, cmd := range path.Commands {
		if strings.ToUpper(cmd.Command) == "L" && len(cmd.Points) > 1 {
			// 合并短的连续线段
			mergedPoints := mergeShortSegments(cmd.Points, minLength)
			newCommands = append(newCommands, PathCommand{
				Command: cmd.Command,
				Points:  mergedPoints,
			})
		} else {
			// 其他命令保持不变
			newCommands = append(newCommands, cmd)
		}
	}

	return SVGPath{
		Commands: newCommands,
		ID:       path.ID,
		Style:    path.Style,
	}
}

// mergeShortSegments merges consecutive short line segments.
func mergeShortSegments(points []Point, minLength float64) []Point {
	if len(points) < 2 {
		return points
	}

	var merged []Point
	merged = append(merged, points[0]) // 起始点

	for i := 1; i < len(points); i++ {
		current := points[i]
		last := merged[len(merged)-1]

		// 计算当前线段长度
		segmentLen := last.Distance(current)

		// 如果线段太短，尝试向前看是否可以合并
		if segmentLen < minLength && i < len(points)-1 {
			// 寻找累积长度超过阈值的点
			totalLen := segmentLen
			j := i

			for j < len(points)-1 && totalLen < minLength {
				j++
				totalLen += points[j-1].Distance(points[j])
			}

			// 跳过中间点，直接连接到j
			if j > i {
				merged = append(merged, points[j])
				i = j
			} else {
				merged = append(merged, current)
			}
		} else {
			merged = append(merged, current)
		}
	}

	return merged
}