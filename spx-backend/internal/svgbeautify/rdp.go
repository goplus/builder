package svgbeautify

import "math"

// PerpendicularDistance calculates the perpendicular distance from a point to a line segment.
func PerpendicularDistance(pt, lineStart, lineEnd Point) float64 {
	dx := lineEnd.X - lineStart.X
	dy := lineEnd.Y - lineStart.Y

	// If start and end points are the same, return distance to start point
	if dx == 0 && dy == 0 {
		return math.Sqrt(math.Pow(pt.X-lineStart.X, 2) + math.Pow(pt.Y-lineStart.Y, 2))
	}

	// Calculate the perpendicular distance using the formula:
	// |((y2-y1)*x0 - (x2-x1)*y0 + x2*y1 - y2*x1)| / sqrt((y2-y1)^2 + (x2-x1)^2)
	numerator := math.Abs(dy*pt.X - dx*pt.Y + lineEnd.X*lineStart.Y - lineEnd.Y*lineStart.X)
	denominator := math.Sqrt(dy*dy + dx*dx)

	return numerator / denominator
}

// RamerDouglasPeucker simplifies a curve using the Ramer-Douglas-Peucker algorithm.
// epsilon: the threshold for simplification (higher values = more simplification).
func RamerDouglasPeucker(points []Point, epsilon float64) []Point {
	if len(points) < 3 {
		return points
	}

	// Find the point with the maximum distance from the line segment
	dmax := 0.0
	index := 0
	for i := 1; i < len(points)-1; i++ {
		d := PerpendicularDistance(points[i], points[0], points[len(points)-1])
		if d > dmax {
			dmax = d
			index = i
		}
	}

	// If the maximum distance is greater than epsilon, recursively simplify
	if dmax > epsilon {
		// Recursive call on the left side
		recResults1 := RamerDouglasPeucker(points[:index+1], epsilon)
		// Recursive call on the right side
		recResults2 := RamerDouglasPeucker(points[index:], epsilon)

		// Combine the results (remove the duplicate point at the junction)
		result := make([]Point, 0, len(recResults1)+len(recResults2)-1)
		result = append(result, recResults1[:len(recResults1)-1]...)
		result = append(result, recResults2...)
		return result
	}

	// If all points are within epsilon distance, return only the endpoints
	return []Point{points[0], points[len(points)-1]}
}

// SimplifyPath simplifies a path using RDP algorithm while preserving path structure.
func SimplifyPath(path SVGPath, epsilon float64) SVGPath {
	simplified := SVGPath{
		ID:       path.ID,
		Style:    path.Style,
		Commands: make([]PathCommand, 0, len(path.Commands)),
	}

	for _, cmd := range path.Commands {
		switch cmd.Command {
		case "M", "L":
			// For move and line commands, apply RDP directly if we have enough points
			if len(cmd.Points) >= 2 {
				simplifiedPoints := RamerDouglasPeucker(cmd.Points, epsilon)
				if len(simplifiedPoints) > 0 {
					simplified.Commands = append(simplified.Commands, PathCommand{
						Command: cmd.Command,
						Points:  simplifiedPoints,
					})
				}
			} else {
				// Keep single points as is
				simplified.Commands = append(simplified.Commands, cmd)
			}
		case "Z", "z":
			// Close path command has no points
			simplified.Commands = append(simplified.Commands, cmd)
		default:
			// For curves (C, Q, S, T) and arcs (A), keep as is for now
			// In a more advanced implementation, we could tessellate these first
			simplified.Commands = append(simplified.Commands, cmd)
		}
	}

	return simplified
}