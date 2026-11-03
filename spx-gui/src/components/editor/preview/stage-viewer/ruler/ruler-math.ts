export type Pos = { x: number; y: number }

export type RulerSnapTarget = Pos & { heading: number | null }

export type SnapResult = {
  pos: Pos
  target: RulerSnapTarget | null
}

export function snapToNearestTarget(
  pos: Pos,
  /** Targets to consider, ordered by preference when distances are equal. */
  targets: readonly RulerSnapTarget[],
  radius: number
): SnapResult {
  let nearest: RulerSnapTarget | null = null
  let nearestDistance = Infinity
  for (const target of targets) {
    const targetDistance = Math.hypot(target.x - pos.x, target.y - pos.y)
    if (targetDistance < nearestDistance) {
      nearest = target
      nearestDistance = targetDistance
    }
  }
  if (nearest != null && nearestDistance <= radius) {
    return { pos: { x: nearest.x, y: nearest.y }, target: nearest }
  }
  return { pos, target: null }
}

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
