export type HoverPlacement = 'top-start' | 'bottom-start'

export type HoverLayout = {
  placement: HoverPlacement
  maxHeight: number
}

const VIEWPORT_MARGIN = 8
const POPUP_GAP = 4
const PREFERRED_CARD_HEIGHT = 376

type VerticalAnchorRect = Pick<DOMRect, 'top' | 'bottom'>

export function resolveHoverLayout(anchorRect: VerticalAnchorRect, viewportHeight: number): HoverLayout {
  const spaceAbove = Math.max(0, anchorRect.top - VIEWPORT_MARGIN - POPUP_GAP)
  const spaceBelow = Math.max(0, viewportHeight - anchorRect.bottom - VIEWPORT_MARGIN - POPUP_GAP)

  let placement: HoverPlacement
  if (spaceAbove >= PREFERRED_CARD_HEIGHT) {
    placement = 'top-start'
  } else if (spaceBelow >= PREFERRED_CARD_HEIGHT) {
    placement = 'bottom-start'
  } else {
    placement = spaceBelow > spaceAbove ? 'bottom-start' : 'top-start'
  }

  const availableHeight = placement === 'top-start' ? spaceAbove : spaceBelow
  return {
    placement,
    maxHeight: Math.min(PREFERRED_CARD_HEIGHT, Math.floor(availableHeight))
  }
}

export function resolveHoverMaxHeight(
  placement: HoverPlacement,
  anchorRect: VerticalAnchorRect,
  viewportHeight: number
) {
  const availableHeight =
    placement === 'top-start'
      ? anchorRect.top - VIEWPORT_MARGIN - POPUP_GAP
      : viewportHeight - anchorRect.bottom - VIEWPORT_MARGIN - POPUP_GAP
  return Math.min(PREFERRED_CARD_HEIGHT, Math.max(0, Math.floor(availableHeight)))
}
