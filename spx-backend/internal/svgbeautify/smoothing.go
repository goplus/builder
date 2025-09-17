package svgbeautify

import (
	"math"
)

// CurveSmoothing performs curve fitting and smoothing on simplified paths.
type CurveSmoothing struct {
	tension      float64 // Curve tension (0.0 to 1.0)
	samplePoints int     // Number of sample points for curve generation
}

// NewCurveSmoothing creates a new curve smoothing instance.
func NewCurveSmoothing() *CurveSmoothing {
	return &CurveSmoothing{
		tension:      0.6, // 增加张力，让曲线更平滑
		samplePoints: 3,   // 保持较少采样点数，避免点数爆炸
	}
}

// SetTension sets the curve tension (0.0 = tight, 1.0 = loose).
func (cs *CurveSmoothing) SetTension(tension float64) {
	if tension >= 0 && tension <= 1 {
		cs.tension = tension
	}
}

// SetSamplePoints sets the number of sample points for curve generation.
func (cs *CurveSmoothing) SetSamplePoints(points int) {
	if points > 0 {
		cs.samplePoints = points
	}
}

// SmoothPath applies curve smoothing to a simplified path.
func (cs *CurveSmoothing) SmoothPath(path SVGPath) SVGPath {
	smoothed := SVGPath{
		ID:       path.ID,
		Style:    path.Style,
		Commands: make([]PathCommand, 0, len(path.Commands)),
	}

	for _, cmd := range path.Commands {
		switch cmd.Command {
		case "M", "L":
			if len(cmd.Points) >= 2 {
				// 降低阈值，对2个或更多点也应用平滑
				smoothedCmd := cs.fitCurveToPoints(cmd.Points, cmd.Command)
				smoothed.Commands = append(smoothed.Commands, smoothedCmd)
			} else {
				// Keep single points as is
				smoothed.Commands = append(smoothed.Commands, cmd)
			}
		default:
			// Keep other commands unchanged
			smoothed.Commands = append(smoothed.Commands, cmd)
		}
	}

	return smoothed
}

// fitCurveToPoints fits a smooth curve through a series of points.
func (cs *CurveSmoothing) fitCurveToPoints(points []Point, originalCmd string) PathCommand {
	if len(points) < 3 {
		return PathCommand{
			Command: originalCmd,
			Points:  points,
		}
	}

	// 对于简单情况，直接转换为贝塞尔控制点
	bezierPoints := cs.convertToBezier(points)
	return PathCommand{
		Command: "C", // Use cubic Bezier curves
		Points:  bezierPoints,
	}
}

// generateCatmullRomSpline generates a smooth Catmull-Rom spline through points.
func (cs *CurveSmoothing) generateCatmullRomSpline(points []Point) []Point {
	if len(points) < 3 {
		return points
	}

	var curvePoints []Point

	// Add control points at the beginning and end for smooth curves
	extendedPoints := make([]Point, len(points)+2)
	extendedPoints[0] = points[0] // Duplicate first point
	copy(extendedPoints[1:], points)
	extendedPoints[len(extendedPoints)-1] = points[len(points)-1] // Duplicate last point

	// Generate spline segments
	for i := 1; i < len(extendedPoints)-2; i++ {
		p0 := extendedPoints[i-1]
		p1 := extendedPoints[i]
		p2 := extendedPoints[i+1]
		p3 := extendedPoints[i+2]

		// Generate points along this segment
		segmentPoints := cs.generateSplineSegment(p0, p1, p2, p3)
		curvePoints = append(curvePoints, segmentPoints...)
	}

	return curvePoints
}

// generateSplineSegment generates points along a Catmull-Rom spline segment.
func (cs *CurveSmoothing) generateSplineSegment(p0, p1, p2, p3 Point) []Point {
	var segmentPoints []Point

	for i := 0; i < cs.samplePoints; i++ {
		t := float64(i) / float64(cs.samplePoints-1)
		point := cs.catmullRomInterpolate(p0, p1, p2, p3, t)
		segmentPoints = append(segmentPoints, point)
	}

	return segmentPoints
}

// catmullRomInterpolate calculates a point on a Catmull-Rom spline.
func (cs *CurveSmoothing) catmullRomInterpolate(p0, p1, p2, p3 Point, t float64) Point {
	t2 := t * t
	t3 := t2 * t

	// Calculate interpolated position using Catmull-Rom spline formula
	x := 0.5 * ((2*p1.X) + (-p0.X + p2.X)*t + (2*p0.X - 5*p1.X + 4*p2.X - p3.X)*t2 + (-p0.X + 3*p1.X - 3*p2.X + p3.X)*t3)
	y := 0.5 * ((2*p1.Y) + (-p0.Y + p2.Y)*t + (2*p0.Y - 5*p1.Y + 4*p2.Y - p3.Y)*t2 + (-p0.Y + 3*p1.Y - 3*p2.Y + p3.Y)*t3)

	return Point{X: x, Y: y}
}

// convertToBezier converts a series of points to cubic Bezier control points.
// Generates proper triplets of control points for each curve segment.
func (cs *CurveSmoothing) convertToBezier(points []Point) []Point {
	if len(points) < 2 {
		return points
	}

	if len(points) == 2 {
		// 直线情况，转换为简单的贝塞尔曲线
		p1, p2 := points[0], points[1]
		// 控制点在直线的1/3和2/3处
		cp1 := Point{
			X: p1.X + (p2.X-p1.X)*0.33,
			Y: p1.Y + (p2.Y-p1.Y)*0.33,
		}
		cp2 := Point{
			X: p1.X + (p2.X-p1.X)*0.67,
			Y: p1.Y + (p2.Y-p1.Y)*0.67,
		}
		return []Point{cp1, cp2, p2}
	}

	var bezierPoints []Point

	// 为每个线段生成贝塞尔控制点
	for i := 0; i < len(points)-1; i++ {
		curr := points[i]
		next := points[i+1]

		// 计算控制点
		var cp1, cp2 Point

		if i == 0 {
			// 第一个线段，使用更强的控制点
			cp1 = Point{
				X: curr.X + (next.X-curr.X)*0.35,
				Y: curr.Y + (next.Y-curr.Y)*0.35,
			}
		} else {
			// 中间线段，考虑前一个点的方向
			prev := points[i-1]
			cp1 = cs.calculateSmoothControlPoint(prev, curr, next, true)
		}

		if i == len(points)-2 {
			// 最后一个线段，使用更强的控制点
			cp2 = Point{
				X: curr.X + (next.X-curr.X)*0.65,
				Y: curr.Y + (next.Y-curr.Y)*0.65,
			}
		} else {
			// 中间线段，考虑下一个点的方向
			nextNext := points[i+2]
			cp2 = cs.calculateSmoothControlPoint(curr, next, nextNext, false)
		}

		// 添加贝塞尔三元组：控制点1，控制点2，终点
		bezierPoints = append(bezierPoints, cp1, cp2, next)
	}

	return bezierPoints
}

// calculateSmoothControlPoint calculates a control point for smooth curve transition.
func (cs *CurveSmoothing) calculateSmoothControlPoint(prev, curr, next Point, isFirst bool) Point {
	// 计算方向向量
	dx1 := curr.X - prev.X
	dy1 := curr.Y - prev.Y
	dx2 := next.X - curr.X
	dy2 := next.Y - curr.Y

	// 计算平均方向
	avgDx := (dx1 + dx2) * 0.5
	avgDy := (dy1 + dy2) * 0.5

	// 计算控制点距离 - 增加距离让曲线更明显
	distance := math.Sqrt(avgDx*avgDx + avgDy*avgDy) * cs.tension * 0.4

	// 标准化方向
	if avgDx != 0 || avgDy != 0 {
		length := math.Sqrt(avgDx*avgDx + avgDy*avgDy)
		avgDx /= length
		avgDy /= length
	}

	// 根据位置调整控制点
	if isFirst {
		return Point{
			X: curr.X + avgDx*distance,
			Y: curr.Y + avgDy*distance,
		}
	} else {
		return Point{
			X: curr.X - avgDx*distance,
			Y: curr.Y - avgDy*distance,
		}
	}
}

// PointsToBezierControlPoints converts a series of points to cubic Bezier control points.
func (cs *CurveSmoothing) PointsToBezierControlPoints(points []Point) []Point {
	if len(points) < 2 {
		return points
	}

	var controlPoints []Point

	// Start with the first point
	controlPoints = append(controlPoints, points[0])

	for i := 1; i < len(points)-1; i++ {
		prev := points[i-1]
		curr := points[i]
		next := points[i+1]

		// Calculate control points for smooth curve
		cp1 := cs.calculateControlPoint(prev, curr, next, false)
		cp2 := cs.calculateControlPoint(prev, curr, next, true)

		controlPoints = append(controlPoints, cp1, cp2, curr)
	}

	return controlPoints
}

// calculateControlPoint calculates a control point for smooth curve transition.
func (cs *CurveSmoothing) calculateControlPoint(prev, curr, next Point, isSecond bool) Point {
	// Calculate the direction vector
	dx1 := curr.X - prev.X
	dy1 := curr.Y - prev.Y
	dx2 := next.X - curr.X
	dy2 := next.Y - curr.Y

	// Average the directions for smooth transition
	avgDx := (dx1 + dx2) / 2
	avgDy := (dy1 + dy2) / 2

	// Calculate control point distance based on curve tension
	distance := math.Sqrt(avgDx*avgDx + avgDy*avgDy) * cs.tension

	// Normalize direction
	if avgDx != 0 || avgDy != 0 {
		length := math.Sqrt(avgDx*avgDx + avgDy*avgDy)
		avgDx /= length
		avgDy /= length
	}

	// Calculate control point position
	if isSecond {
		return Point{
			X: curr.X - avgDx*distance,
			Y: curr.Y - avgDy*distance,
		}
	}
	return Point{
		X: curr.X + avgDx*distance,
		Y: curr.Y + avgDy*distance,
	}
}

// ApproximateCurveWithLines approximates a curve with line segments for display.
func (cs *CurveSmoothing) ApproximateCurveWithLines(curvePoints []Point, tolerance float64) []Point {
	if len(curvePoints) < 3 {
		return curvePoints
	}

	// Use RDP algorithm to further simplify the curve points
	return RamerDouglasPeucker(curvePoints, tolerance)
}