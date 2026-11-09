export type Pos = { x: number; y: number }

export function headingToScreenDeg(heading: number) {
  return heading - 90
}

export function segmentScreenDeg(from: Pos, to: Pos) {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI
}

export function turnAngle(from: Pos, to: Pos, heading: number): number {
  const relative = segmentScreenDeg(from, to) - headingToScreenDeg(heading)
  const normalized = relative - 360 * Math.floor((relative + 180) / 360)
  return normalized === -180 ? 180 : normalized
}
