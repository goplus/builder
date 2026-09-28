export type Pos = { x: number; y: number }

/**
 * Screen-space angle (degrees, clockwise from the +x axis — Konva's convention) of a sprite
 * heading (spx convention: 0 = up, 90 = right, clockwise).
 */
export function headingToScreenDeg(heading: number) {
  return heading - 90
}

/** Screen-space angle (degrees, clockwise from the +x axis) of the segment `from` → `to`, in map coordinates (y down). */
export function segmentScreenDeg(from: Pos, to: Pos) {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI
}

/**
 * The signed angle (degrees, in `(-180, 180]`) a sprite with the given heading should turn to
 * face `to` from `from` (map coordinates, y down) — exactly the number `turn` expects:
 * positive turns right, negative turns left.
 */
export function turnAngle(from: Pos, to: Pos, heading: number): number {
  const rel = segmentScreenDeg(from, to) - headingToScreenDeg(heading)
  const normalized = rel - 360 * Math.floor((rel + 180) / 360)
  return normalized === -180 ? 180 : normalized
}
