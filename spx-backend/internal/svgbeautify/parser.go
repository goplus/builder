package svgbeautify

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

// ParseSVGPaths extracts and parses all path elements from SVG content.
func ParseSVGPaths(svgContent string) ([]SVGPath, error) {
	var paths []SVGPath

	// Regular expression to match path elements
	pathRegex := regexp.MustCompile(`<path[^>]*\sd\s*=\s*"([^"]*)"[^>]*>`)
	idRegex := regexp.MustCompile(`id\s*=\s*"([^"]*)"`)
	styleRegex := regexp.MustCompile(`style\s*=\s*"([^"]*)"`)

	matches := pathRegex.FindAllStringSubmatch(svgContent, -1)

	for _, match := range matches {
		if len(match) >= 2 {
			pathElement := match[0]
			dAttribute := match[1]

			// Extract id and style if present
			var id, style string
			if idMatch := idRegex.FindStringSubmatch(pathElement); len(idMatch) >= 2 {
				id = idMatch[1]
			}
			if styleMatch := styleRegex.FindStringSubmatch(pathElement); len(styleMatch) >= 2 {
				style = styleMatch[1]
			}

			// Parse the d attribute
			commands, err := parsePathData(dAttribute)
			if err != nil {
				return nil, fmt.Errorf("failed to parse path data: %w", err)
			}

			paths = append(paths, SVGPath{
				Commands: commands,
				ID:       id,
				Style:    style,
			})
		}
	}

	return paths, nil
}

// parsePathData parses SVG path data string into commands and points.
func parsePathData(d string) ([]PathCommand, error) {
	var commands []PathCommand

	// Clean up the path data
	d = strings.TrimSpace(d)
	if d == "" {
		return commands, nil
	}

	// Regular expression to match path commands with their parameters
	cmdRegex := regexp.MustCompile(`([MmLlHhVvCcSsQqTtAaZz])\s*([^MmLlHhVvCcSsQqTtAaZz]*)`)
	matches := cmdRegex.FindAllStringSubmatch(d, -1)

	// 跟踪当前位置，用于相对坐标转换
	var currentPos Point

	for _, match := range matches {
		if len(match) >= 3 {
			cmdLetter := match[1]
			params := strings.TrimSpace(match[2])

			cmd, err := parseCommand(cmdLetter, params)
			if err != nil {
				return nil, fmt.Errorf("failed to parse command %s: %w", cmdLetter, err)
			}

			// 转换相对坐标为绝对坐标
			cmd = convertToAbsolute(cmd, &currentPos)
			commands = append(commands, cmd)
		}
	}

	// 合并连续的线段命令以便RDP算法能够处理
	commands = mergeConsecutiveLineCommands(commands)

	return commands, nil
}

// parseCommand parses a single path command with its parameters.
func parseCommand(cmdLetter, params string) (PathCommand, error) {
	// 保持原始命令字母（区分大小写很重要）
	cmd := PathCommand{Command: cmdLetter}

	// Handle close path commands (no parameters)
	if strings.ToUpper(cmdLetter) == "Z" {
		return cmd, nil
	}

	// Parse numeric parameters
	if params == "" {
		return cmd, nil
	}

	numbers, err := parseNumbers(params)
	if err != nil {
		return cmd, fmt.Errorf("failed to parse numbers: %w", err)
	}

	// Convert numbers to points based on command type
	switch strings.ToUpper(cmdLetter) {
	case "M", "L": // Move To, Line To
		cmd.Points = numbersToPoints(numbers)
	case "H": // Horizontal Line To (only x coordinates)
		for _, x := range numbers {
			cmd.Points = append(cmd.Points, Point{X: x, Y: 0})
		}
	case "V": // Vertical Line To (only y coordinates)
		for _, y := range numbers {
			cmd.Points = append(cmd.Points, Point{X: 0, Y: y})
		}
	case "C": // Cubic Bezier Curve
		cmd.Points = numbersToPoints(numbers)
	case "S": // Smooth Cubic Bezier Curve
		cmd.Points = numbersToPoints(numbers)
	case "Q": // Quadratic Bezier Curve
		cmd.Points = numbersToPoints(numbers)
	case "T": // Smooth Quadratic Bezier Curve
		cmd.Points = numbersToPoints(numbers)
	case "A": // Elliptical Arc
		cmd.Points = numbersToPoints(numbers)
	default:
		return cmd, fmt.Errorf("unsupported command: %s", cmdLetter)
	}

	return cmd, nil
}

// parseNumbers extracts floating-point numbers from a string.
func parseNumbers(s string) ([]float64, error) {
	var numbers []float64

	// Regular expression to match floating-point numbers (including negative)
	numRegex := regexp.MustCompile(`-?\d*\.?\d+`)
	matches := numRegex.FindAllString(s, -1)

	for _, match := range matches {
		num, err := strconv.ParseFloat(match, 64)
		if err != nil {
			return nil, fmt.Errorf("failed to parse number %s: %w", match, err)
		}
		numbers = append(numbers, num)
	}

	return numbers, nil
}

// numbersToPoints converts pairs of numbers to Point structs.
func numbersToPoints(numbers []float64) []Point {
	var points []Point

	for i := 0; i < len(numbers)-1; i += 2 {
		points = append(points, Point{
			X: numbers[i],
			Y: numbers[i+1],
		})
	}

	return points
}

// convertToAbsolute converts relative coordinates to absolute coordinates.
func convertToAbsolute(cmd PathCommand, currentPos *Point) PathCommand {
	// 如果已经是绝对坐标（大写），直接更新当前位置并返回
	if cmd.Command == strings.ToUpper(cmd.Command) {
		// 更新当前位置到最后一个点
		if len(cmd.Points) > 0 {
			switch strings.ToUpper(cmd.Command) {
			case "M", "L":
				*currentPos = cmd.Points[len(cmd.Points)-1]
			case "H":
				currentPos.X = cmd.Points[len(cmd.Points)-1].X
			case "V":
				currentPos.Y = cmd.Points[len(cmd.Points)-1].Y
			case "C", "S", "Q", "T":
				*currentPos = cmd.Points[len(cmd.Points)-1]
			}
		}
		// 统一转换为大写命令
		cmd.Command = strings.ToUpper(cmd.Command)
		return cmd
	}

	// 处理相对坐标（小写）
	newCmd := PathCommand{Command: strings.ToUpper(cmd.Command)}

	switch strings.ToLower(cmd.Command) {
	case "m", "l": // 相对移动/直线
		for _, point := range cmd.Points {
			absPoint := Point{
				X: currentPos.X + point.X,
				Y: currentPos.Y + point.Y,
			}
			newCmd.Points = append(newCmd.Points, absPoint)
			*currentPos = absPoint
		}
	case "h": // 相对水平线
		for _, point := range cmd.Points {
			currentPos.X += point.X
			newCmd.Points = append(newCmd.Points, Point{X: currentPos.X, Y: currentPos.Y})
		}
	case "v": // 相对垂直线
		for _, point := range cmd.Points {
			currentPos.Y += point.Y
			newCmd.Points = append(newCmd.Points, Point{X: currentPos.X, Y: currentPos.Y})
		}
	case "c": // 相对三次贝塞尔曲线
		for _, point := range cmd.Points {
			absPoint := Point{
				X: currentPos.X + point.X,
				Y: currentPos.Y + point.Y,
			}
			newCmd.Points = append(newCmd.Points, absPoint)
		}
		if len(cmd.Points) > 0 {
			*currentPos = newCmd.Points[len(newCmd.Points)-1]
		}
	case "s": // 相对平滑三次贝塞尔曲线
		for _, point := range cmd.Points {
			absPoint := Point{
				X: currentPos.X + point.X,
				Y: currentPos.Y + point.Y,
			}
			newCmd.Points = append(newCmd.Points, absPoint)
		}
		if len(cmd.Points) > 0 {
			*currentPos = newCmd.Points[len(newCmd.Points)-1]
		}
	case "q": // 相对二次贝塞尔曲线
		for _, point := range cmd.Points {
			absPoint := Point{
				X: currentPos.X + point.X,
				Y: currentPos.Y + point.Y,
			}
			newCmd.Points = append(newCmd.Points, absPoint)
		}
		if len(cmd.Points) > 0 {
			*currentPos = newCmd.Points[len(newCmd.Points)-1]
		}
	case "t": // 相对平滑二次贝塞尔曲线
		for _, point := range cmd.Points {
			absPoint := Point{
				X: currentPos.X + point.X,
				Y: currentPos.Y + point.Y,
			}
			newCmd.Points = append(newCmd.Points, absPoint)
		}
		if len(cmd.Points) > 0 {
			*currentPos = newCmd.Points[len(newCmd.Points)-1]
		}
	case "a": // 相对弧线
		for _, point := range cmd.Points {
			absPoint := Point{
				X: currentPos.X + point.X,
				Y: currentPos.Y + point.Y,
			}
			newCmd.Points = append(newCmd.Points, absPoint)
		}
		if len(cmd.Points) > 0 {
			*currentPos = newCmd.Points[len(newCmd.Points)-1]
		}
	default:
		// 其他命令保持不变
		newCmd = cmd
	}

	return newCmd
}

// mergeConsecutiveLineCommands merges consecutive line commands into single commands
// with multiple points so that RDP algorithm can work effectively.
// Also converts H/V commands to L commands for better simplification.
func mergeConsecutiveLineCommands(commands []PathCommand) []PathCommand {
	if len(commands) == 0 {
		return commands
	}

	var merged []PathCommand
	var currentPoints []Point
	var currentCommand string
	var lastPoint Point

	for _, cmd := range commands {
		switch cmd.Command {
		case "M":
			// 保存之前累积的线段命令
			if len(currentPoints) > 0 {
				merged = append(merged, PathCommand{
					Command: currentCommand,
					Points:  currentPoints,
				})
				currentPoints = nil
				currentCommand = ""
			}
			// 保持Move命令不变
			merged = append(merged, cmd)
			if len(cmd.Points) > 0 {
				lastPoint = cmd.Points[len(cmd.Points)-1]
			}

		case "L":
			if currentCommand == "L" {
				// 合并到当前的线段命令中
				currentPoints = append(currentPoints, cmd.Points...)
			} else {
				// 保存之前累积的命令
				if len(currentPoints) > 0 {
					merged = append(merged, PathCommand{
						Command: currentCommand,
						Points:  currentPoints,
					})
				}
				// 开始新的线段命令
				currentCommand = "L"
				currentPoints = make([]Point, len(cmd.Points))
				copy(currentPoints, cmd.Points)
			}
			if len(cmd.Points) > 0 {
				lastPoint = cmd.Points[len(cmd.Points)-1]
			}

		case "H":
			// 将水平线转换为L命令
			for _, point := range cmd.Points {
				newPoint := Point{X: point.X, Y: lastPoint.Y}
				if currentCommand == "L" {
					currentPoints = append(currentPoints, newPoint)
				} else {
					// 保存之前累积的命令
					if len(currentPoints) > 0 {
						merged = append(merged, PathCommand{
							Command: currentCommand,
							Points:  currentPoints,
						})
					}
					// 开始新的线段命令
					currentCommand = "L"
					currentPoints = []Point{newPoint}
				}
				lastPoint = newPoint
			}

		case "V":
			// 将垂直线转换为L命令
			for _, point := range cmd.Points {
				newPoint := Point{X: lastPoint.X, Y: point.Y}
				if currentCommand == "L" {
					currentPoints = append(currentPoints, newPoint)
				} else {
					// 保存之前累积的命令
					if len(currentPoints) > 0 {
						merged = append(merged, PathCommand{
							Command: currentCommand,
							Points:  currentPoints,
						})
					}
					// 开始新的线段命令
					currentCommand = "L"
					currentPoints = []Point{newPoint}
				}
				lastPoint = newPoint
			}

		default:
			// 保存之前累积的线段命令
			if len(currentPoints) > 0 {
				merged = append(merged, PathCommand{
					Command: currentCommand,
					Points:  currentPoints,
				})
				currentPoints = nil
				currentCommand = ""
			}
			// 保持其他命令不变
			merged = append(merged, cmd)
		}
	}

	// 保存最后累积的命令
	if len(currentPoints) > 0 {
		merged = append(merged, PathCommand{
			Command: currentCommand,
			Points:  currentPoints,
		})
	}

	return merged
}