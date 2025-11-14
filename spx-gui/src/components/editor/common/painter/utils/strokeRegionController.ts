import paper from 'paper'
import { PaperOffset } from 'paperjs-offset'
import type { StrokeCapType, StrokeJoinType } from 'paperjs-offset/src/offset_core'

/**
 * Provides helpers for recording freehand strokes and expanding them into filled regions.
 *  - `buildRegionFromStroke` turns a paper.Path into an inflated shape that can be used for hit tests.
 *  - `createStrokeRegionController` wraps the common state machine needed by brush / eraser tools.
 */

const DEFAULT_MIN_DISTANCE = 2
const DEFAULT_SIMPLIFY_TOLERANCE = 3

type StrokeCap = paper.Path['strokeCap']
type StrokeJoin = paper.Path['strokeJoin']

/**
 * Paper.js 的 `strokeCap` 是 string，但 paperjs-offset 用更严格的联合类型；
 * 这些转换函数确保传给 offset 引擎的值合法。
 */
const toOffsetCap = (cap?: StrokeCap): StrokeCapType => {
  if (cap === 'round') return 'round'
  if (cap === 'butt') return 'butt'
  return 'butt'
}

const toOffsetJoin = (join?: StrokeJoin): StrokeJoinType => {
  if (join === 'bevel') return 'bevel'
  if (join === 'round') return 'round'
  return 'miter'
}

export interface StrokeRegionControllerOptions {
  minDistance?: number
  simplifyTolerance?: number
  strokeStyle?: Partial<paper.Style>
}

export interface StartStrokeOptions {
  point: paper.Point
  strokeWidth: number
  strokeColor?: paper.Color | string
  strokeCap?: StrokeCap
  strokeJoin?: StrokeJoin
}

export interface FinalizeRegionOptions {
  radius?: number
  simplifyTolerance?: number
}

export interface BuildRegionOptions {
  simplifyTolerance?: number
  cap?: StrokeCap
  join?: StrokeJoin
}

export interface StrokeRegionResult {
  region: paper.PathItem | null
  strokePath: paper.Path | null
}

export interface StrokeRegionController {
  startStroke(options: StartStrokeOptions): paper.Path
  extendStroke(point: paper.Point, minDistance?: number): void
  finalizeRegion(options?: FinalizeRegionOptions): StrokeRegionResult
  reset(removePath?: boolean): void
  getPath(): paper.Path | null
}

const cleanupPath = (path: paper.Path | null): void => {
  if (path) {
    try {
      path.remove()
    } catch (error) {
      console.warn('Failed to remove path during cleanup:', error)
    }
  }
}

export const buildRegionFromStroke = (
  strokePath: paper.Path,
  radius: number,
  { simplifyTolerance = DEFAULT_SIMPLIFY_TOLERANCE, cap, join }: BuildRegionOptions = {}
): paper.PathItem | null => {
  if (!strokePath || strokePath.segments.length === 0) {
    return null
  }

  const effectiveCap = cap ?? strokePath.strokeCap ?? 'round'
  const effectiveJoin = join ?? strokePath.strokeJoin ?? 'round'

  if (strokePath.segments.length <= 1) {
    return new paper.Path.Circle({
      center: strokePath.firstSegment.point,
      radius
    })
  }

  if (simplifyTolerance > 0 && strokePath.segments.length > 2) {
    strokePath.simplify(simplifyTolerance)
  }

  const offsetShape = PaperOffset.offsetStroke(strokePath, radius, {
    cap: toOffsetCap(effectiveCap),
    join: toOffsetJoin(effectiveJoin)
  })

  if (!offsetShape) {
    return null
  }

  const region = offsetShape.unite(offsetShape)
  offsetShape.remove()
  return region
}

/**
 * Creates a reusable controller that captures pointer input and produces a region path.
 * Consumers（例如橡皮擦、笔刷）只需要在鼠标事件里调用 `startStroke / extendStroke / finalizeRegion`。
 */
export const createStrokeRegionController = (options: StrokeRegionControllerOptions = {}): StrokeRegionController => {
  let activePath: paper.Path | null = null
  let lastPoint: paper.Point | null = null
  let currentStrokeWidth = 0

  const resetState = (removePath = false): void => {
    if (removePath) {
      cleanupPath(activePath)
    }
    activePath = null
    lastPoint = null
    currentStrokeWidth = 0
  }

  const startStroke = ({
    point,
    strokeWidth,
    strokeColor = 'white',
    strokeCap = 'round',
    strokeJoin = 'round'
  }: StartStrokeOptions): paper.Path => {
    resetState(true)

    currentStrokeWidth = strokeWidth
    activePath = new paper.Path({
      strokeColor,
      strokeWidth,
      strokeCap,
      strokeJoin
    })

    if (options.strokeStyle) {
      Object.assign(activePath.style, options.strokeStyle)
    }

    activePath.add(point)
    lastPoint = point
    return activePath
  }

  const extendStroke = (point: paper.Point, minDistance?: number): void => {
    if (!activePath || !lastPoint) return

    const distanceThreshold = minDistance ?? options.minDistance ?? DEFAULT_MIN_DISTANCE
    if (point.getDistance(lastPoint) < distanceThreshold) {
      return
    }

    activePath.add(point)
    lastPoint = point
  }

  const finalizeRegion = ({ radius, simplifyTolerance }: FinalizeRegionOptions = {}): StrokeRegionResult => {
    if (!activePath) {
      return { region: null, strokePath: null }
    }

    const strokePath = activePath
    const effectiveRadius = radius ?? Math.max(currentStrokeWidth, 1) / 2
    const effectiveSimplify = simplifyTolerance ?? options.simplifyTolerance ?? DEFAULT_SIMPLIFY_TOLERANCE

    const region = buildRegionFromStroke(strokePath, effectiveRadius, {
      simplifyTolerance: effectiveSimplify
    })

    resetState(false)

    return { region, strokePath }
  }

  const reset = (removePath = false): void => {
    resetState(removePath)
  }

  const getPath = (): paper.Path | null => activePath

  return {
    startStroke,
    extendStroke,
    finalizeRegion,
    reset,
    getPath
  }
}
