export type EditorLayout = 'landscape' | 'portrait' | 'focused'

type Size = { width: number; height: number }

function getBasePreviewViewportWidth(viewport: Size) {
  const ratio = viewport.width / viewport.height
  if (Math.abs(ratio - 4 / 3) < 0.002) return 472
  if (Math.abs(ratio - 16 / 9) < 0.002) return 545
  if (Math.abs(ratio - 9 / 16) < 0.002) return 307
  return viewport.width
}

function getPortraitPreviewWidthForHeight(containerHeight: number, viewport: Size) {
  const previewHeaderHeight = 48
  const previewPadding = 24
  const panelGap = 16
  const stagePanelHeight = 120
  const columnBottomPadding = 16
  const availableViewportHeight = Math.max(
    0,
    containerHeight -
      previewHeaderHeight -
      previewPadding -
      panelGap -
      stagePanelHeight -
      columnBottomPadding
  )
  return Math.floor(availableViewportHeight * (viewport.width / viewport.height) + previewPadding)
}

export function getPaneLayout(
  container: Size,
  viewport: Size,
  layout: EditorLayout,
  preferredCodeWidth: number | null
) {
  const gap = 16
  const minCodeWidth = 384
  const minPreviewWidth = 320
  const previewPaddingWidth = 24
  const layoutWidth =
    layout === 'portrait' ? Math.max(container.width, minCodeWidth + minPreviewWidth + gap) : container.width
  const availableWidth = Math.max(0, layoutWidth - gap)
  const availablePreviewWidth = Math.max(0, availableWidth - minCodeWidth)
  const requestedPreviewWidth = Math.max(
    0,
    Math.min(
      availablePreviewWidth,
      preferredCodeWidth == null ? availablePreviewWidth : availableWidth - preferredCodeWidth
    )
  )
  const maxPreviewWidth =
    layout === 'portrait'
      ? Math.min(availablePreviewWidth, getPortraitPreviewWidthForHeight(container.height, viewport))
      : availablePreviewWidth
  const clampedMinPreviewWidth = Math.min(minPreviewWidth, maxPreviewWidth)
  const defaultPreviewWidth =
    layout === 'focused'
      ? Math.max(660, availableWidth * (3 / 6.5))
      : Math.min(
          getBasePreviewViewportWidth(viewport) + previewPaddingWidth,
          maxPreviewWidth
        )
  const previewWidth = Math.max(
    clampedMinPreviewWidth,
    Math.min(maxPreviewWidth, preferredCodeWidth == null ? defaultPreviewWidth : requestedPreviewWidth)
  )
  return {
    previewWidth,
    codeWidth: availableWidth - previewWidth,
    minCodeWidth: availableWidth - maxPreviewWidth,
    maxCodeWidth: availableWidth - clampedMinPreviewWidth
  }
}
