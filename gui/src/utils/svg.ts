function point(x: number, y: number, r: number, angel: number) {
  return [(x + Math.sin(angel) * r).toFixed(2), (y - Math.cos(angel) * r).toFixed(2)]
}

function full(x: number, y: number, R: number, r: number) {
  if (r <= 0) {
    return `M ${x - R} ${y} A ${R} ${R} 0 1 1 ${x + R} ${y} A ${R} ${R} 1 1 1 ${x - R} ${y} Z`
  }
  return `M ${x - R} ${y} A ${R} ${R} 0 1 1 ${x + R} ${y} A ${R} ${R} 1 1 1 ${x - R} ${y} M ${x - r} ${y} A ${r} ${r} 0 1 1 ${x + r} ${y} A ${r} ${r} 1 1 1 ${x - r} ${y} Z`
}

function part(x: number, y: number, R: number, r: number, start: number, end: number) {
  const [s, e] = [(start / 360) * 2 * Math.PI, (end / 360) * 2 * Math.PI]
  const P = [point(x, y, r, s), point(x, y, R, s), point(x, y, R, e), point(x, y, r, e)]
  const flag = e - s > Math.PI ? '1' : '0'
  return `M ${P[0][0]} ${P[0][1]} L ${P[1][0]} ${P[1][1]} A ${R} ${R} 0 ${flag} 1 ${P[2][0]} ${P[2][1]} L ${P[3][0]} ${P[3][1]} A ${r} ${r} 0 ${flag} 0 ${P[0][0]} ${P[0][1]} Z`
}

export type ArcPathOptions = {
  /** The x-coordinate of the center of the circle */
  x: number
  /** The y-coordinate of the center of the circle */
  y: number
  /** Outside Radius */
  R?: number
  /** Inside Radius */
  r: number
  /** The starting angle, 0～360 */
  start: number
  /** The ending angle, 0～360 */
  end: number
}

/**
 * Generates an SVG path string for an arc.
 * Related doc: https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorials/SVG_from_scratch/Paths
 */
export function makeArcPathString({ x, y, R = 0, r, start, end }: ArcPathOptions) {
  if (R < r) [R, r] = [r, R]
  if (R <= 0) return ''
  if (start !== +start || end !== +end) return full(x, y, R, r)
  if (Math.abs(start - end) < 0.000001) return ''
  if (Math.abs(start - end) % 360 < 0.000001) return full(x, y, R, r)

  start = start % 360
  end = end % 360

  if (start > end) end += 360
  return part(x, y, R, r, start, end)
}
