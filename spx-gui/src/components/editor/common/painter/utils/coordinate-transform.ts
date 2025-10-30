import paper from 'paper'

/**
 * Coordinate transformation utility module
 * Provides functions to transform between project coordinates and view coordinates
 */

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Transform a point from project coordinates to view coordinates
 * @param point Point in project coordinates
 * @returns Point in view coordinates, returns {x: 0, y: 0} if paper.view does not exist
 */
export function projectToView(point: Point): Point {
  if (!paper.view) return { x: 0, y: 0 }
  const paperPoint = new paper.Point(point.x, point.y)
  const viewPoint = paper.view.projectToView(paperPoint)
  return { x: viewPoint.x, y: viewPoint.y }
}

/**
 * Transform a paper.Point from project coordinates to view coordinates
 * @param point paper.Point in project coordinates
 * @returns Point in view coordinates, returns {x: 0, y: 0} if paper.view does not exist
 */
export function projectPaperPointToView(point: paper.Point): Point {
  if (!paper.view) return { x: 0, y: 0 }
  const viewPoint = paper.view.projectToView(point)
  return { x: viewPoint.x, y: viewPoint.y }
}

/**
 * Transform a point from view coordinates to project coordinates
 * @param point Point in view coordinates
 * @returns Point in project coordinates, returns {x: 0, y: 0} if paper.view does not exist
 */
export function viewToProject(point: Point): Point {
  if (!paper.view) return { x: 0, y: 0 }
  const paperPoint = new paper.Point(point.x, point.y)
  const projectPoint = paper.view.viewToProject(paperPoint)
  return { x: projectPoint.x, y: projectPoint.y }
}

/**
 * Transform a rectangle from project coordinates to view coordinates
 * @param rect Rectangle in project coordinates
 * @returns Rectangle in view coordinates
 */
export function projectRectToView(rect: Rect): Rect {
  if (!paper.view) return { x: 0, y: 0, width: 0, height: 0 }

  const topLeft = new paper.Point(rect.x, rect.y)
  const bottomRight = new paper.Point(rect.x + rect.width, rect.y + rect.height)

  const topLeftView = paper.view.projectToView(topLeft)
  const bottomRightView = paper.view.projectToView(bottomRight)

  return {
    x: topLeftView.x,
    y: topLeftView.y,
    width: bottomRightView.x - topLeftView.x,
    height: bottomRightView.y - topLeftView.y
  }
}

/**
 * Get current view zoom level
 * @returns Zoom level, returns 1 if paper.view does not exist
 */
export function getZoom(): number {
  return paper.view?.zoom ?? 1
}

/**
 * Transform a distance from project coordinates to view coordinates (considering zoom)
 * @param distance Distance in project coordinates
 * @returns Distance in view coordinates
 */
export function projectDistanceToView(distance: number): number {
  return distance * getZoom()
}
