package svgbeautify

import "math"

// Point represents a 2D point with X and Y coordinates.
type Point struct {
	X, Y float64
}

// Distance calculates the Euclidean distance between two points.
func (p Point) Distance(other Point) float64 {
	dx := p.X - other.X
	dy := p.Y - other.Y
	return math.Sqrt(dx*dx + dy*dy)
}


// PathCommand represents an SVG path command.
type PathCommand struct {
	Command string    // M, L, C, Q, Z, etc.
	Points  []Point   // Associated points
}

// SVGPath represents a parsed SVG path.
type SVGPath struct {
	Commands []PathCommand
	ID       string // path id attribute
	Style    string // path style attribute
}