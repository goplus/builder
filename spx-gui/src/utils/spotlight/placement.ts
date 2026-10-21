export type SpotlightPlacement = `${'top' | 'bottom'}-${'left' | 'right'}`

type Size = { width: number; height: number }
type TargetRect = Size & { top: number; bottom: number; left: number; right: number }

export const spotlightMetrics = {
  anchorSize: 26,
  anchorOffsetX: 6,
  anchorOffsetY: 4,
  gap: 16,
  edgePadding: 16
}

/** Position the complete arrow/tip footprint, including the CSS offsets between them. */
export function getSpotlightPosition(target: TargetRect, tip: Size, viewport: Size) {
  const { anchorSize, anchorOffsetX, anchorOffsetY, gap, edgePadding } = spotlightMetrics
  // The tip follows the arrow in normal flow before its placement transform is applied.
  const lowerExtent = Math.max(anchorSize, tip.height + anchorSize - anchorOffsetY)
  const upperExtent = Math.max(anchorSize, tip.height + anchorSize - anchorOffsetY / 2)
  const lowerSpace = viewport.height - target.bottom
  const upperSpace = target.top
  const lowerFits = lowerSpace >= gap + lowerExtent + edgePadding
  const upperFits = upperSpace >= gap + upperExtent + edgePadding
  const useLower = lowerFits || (!upperFits && lowerSpace >= upperSpace)

  const horizontalExtent = Math.max(anchorSize, tip.width + anchorSize - anchorOffsetX / (useLower ? 1 : 2))
  const rightSpace = viewport.width - target.right
  const leftSpace = target.left
  const rightFits = rightSpace >= gap + horizontalExtent + edgePadding
  const leftFits = leftSpace >= gap + horizontalExtent + edgePadding
  const useRight = rightFits || (!leftFits && rightSpace >= leftSpace)

  const x = useRight ? target.right + gap : target.left - gap
  const y = useLower ? target.bottom + gap : target.top - gap
  const minX = edgePadding + (useRight ? 0 : horizontalExtent)
  const maxX = viewport.width - edgePadding - (useRight ? horizontalExtent : 0)
  const minY = edgePadding + (useLower ? 0 : upperExtent)
  const maxY = viewport.height - edgePadding - (useLower ? lowerExtent : 0)
  const placement: SpotlightPlacement = `${useLower ? 'bottom' : 'top'}-${useRight ? 'right' : 'left'}`

  return {
    x: Math.max(minX, Math.min(x, maxX)),
    y: Math.max(minY, Math.min(y, maxY)),
    placement
  }
}
