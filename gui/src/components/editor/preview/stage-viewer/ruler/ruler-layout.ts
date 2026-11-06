export type Pos = { x: number; y: number }

export type LabelLayout = Pos & { width: number; height: number; text: string }

export type VisibleMapRect = {
  left: number
  top: number
  right: number
  bottom: number
}

/** Return the portion of the map currently visible through the stage viewport. */
export function getVisibleMapRect(
  mapPos: Pos,
  mapSize: { width: number; height: number },
  viewportSize: { width: number; height: number }
): VisibleMapRect {
  return {
    left: Math.max(0, -mapPos.x),
    top: Math.max(0, -mapPos.y),
    right: Math.min(mapSize.width, viewportSize.width - mapPos.x),
    bottom: Math.min(mapSize.height, viewportSize.height - mapPos.y)
  }
}

/** Keep the complete label rectangle inside a visible map rectangle. */
export function clampLabelToRect(layout: LabelLayout, rect: VisibleMapRect, padding = 4): LabelLayout {
  const minX = rect.left + padding
  const minY = rect.top + padding
  const maxX = Math.max(minX, rect.right - layout.width - padding)
  const maxY = Math.max(minY, rect.bottom - layout.height - padding)
  return {
    ...layout,
    x: Math.min(Math.max(layout.x, minX), maxX),
    y: Math.min(Math.max(layout.y, minY), maxY)
  }
}
