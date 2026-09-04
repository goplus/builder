export type EditorLayout = 'landscape' | 'portrait' | 'focused'

type Size = { width: number; height: number }

export function getPaneLayout(
  container: Size,
  viewport: Size,
  layout: EditorLayout,
  preferredCodeWidth: number | null
) {
  const gap = 16
  const previewChromeHeight = 72
  const previewPaddingWidth = 24
  const bottomPanelsHeight = 200
  const availableWidth = Math.max(0, container.width - gap)
  const availableRightWidth = Math.max(0, availableWidth - 384)
  const ratio = viewport.width / viewport.height
  const fullHeightWidth = Math.max(0, container.height - previewChromeHeight) * ratio + previewPaddingWidth
  const stackedWidth =
    Math.max(0, container.height - previewChromeHeight - gap - bottomPanelsHeight) * ratio + previewPaddingWidth
  const requestedRightWidth = Math.max(
    0,
    Math.min(
      availableRightWidth,
      preferredCodeWidth == null ? availableRightWidth : availableWidth - preferredCodeWidth
    )
  )
  // Choose the portrait arrangement from the browser space, not the drag position.
  // Otherwise moving panels below Preview makes the divider jump under the pointer.
  const portraitRail = layout === 'portrait' && availableRightWidth - 208 - gap >= stackedWidth
  const railWidth =
    preferredCodeWidth == null ? 208 : Math.max(208, Math.min(320, requestedRightWidth - fullHeightWidth - gap))
  const heightLimitedWidth = portraitRail ? fullHeightWidth + railWidth + gap : stackedWidth
  const maxRightWidth = layout === 'focused' ? availableRightWidth : Math.min(availableRightWidth, heightLimitedWidth)
  // Keep a usable portrait preview beside the two-column sprite list.
  const minRightWidth = Math.min(portraitRail ? 240 + 208 + gap : 320, maxRightWidth)
  const defaultRightWidth =
    layout === 'focused'
      ? Math.max(660, availableWidth * (3 / 6.5))
      : layout === 'portrait'
        ? maxRightWidth
        : Math.min(640, Math.max(360, container.width * 0.4), maxRightWidth)
  const rightWidth = Math.max(
    minRightWidth,
    Math.min(maxRightWidth, preferredCodeWidth == null ? defaultRightWidth : requestedRightWidth)
  )
  return {
    rightWidth,
    codeWidth: availableWidth - rightWidth,
    minCodeWidth:
      availableWidth - (portraitRail ? Math.min(availableRightWidth, fullHeightWidth + 320 + gap) : maxRightWidth),
    maxCodeWidth: availableWidth - minRightWidth,
    portraitRail,
    railWidth
  }
}
