export type EditorLayout = 'landscape' | 'portrait' | 'focused'

type Size = { width: number; height: number }

const minPreviewArea = 130_000
const maxPreviewArea = 170_000
const previewPaddingWidth = 24
const panelGap = 16
const spriteRailWidth = 104

function getBasePreviewViewportWidth(viewport: Size) {
  const ratio = viewport.width / viewport.height
  if (Math.abs(ratio - 4 / 3) < 0.002) return 472
  if (Math.abs(ratio - 16 / 9) < 0.003) return 472
  if (Math.abs(ratio - 9 / 16) < 0.002) return 307
  return viewport.width
}

function getPortraitPreviewWidthForHeight(containerHeight: number, viewport: Size) {
  const previewHeaderHeight = 48
  const previewPadding = 24
  const panelGap = 16
  const stageHeight = 144
  const availableViewportHeight = Math.max(
    0,
    containerHeight - previewHeaderHeight - previewPadding - panelGap - stageHeight
  )
  return Math.floor(availableViewportHeight * (viewport.width / viewport.height) + previewPadding)
}

function getPreviewWidthForArea(viewport: Size, area: number) {
  const ratio = viewport.width / viewport.height
  return Math.floor(Math.sqrt(area * ratio) + previewPaddingWidth)
}

export function getPaneLayout(container: Size, viewport: Size, layout: EditorLayout) {
  const gap = panelGap
  const minCodeWidth = 384
  const portraitExtraWidth = layout === 'portrait' ? panelGap + spriteRailWidth : 0
  const minPreviewWidth =
    layout === 'focused' ? 320 : getPreviewWidthForArea(viewport, minPreviewArea) + portraitExtraWidth
  const layoutWidth =
    layout === 'portrait' ? Math.max(container.width, minCodeWidth + minPreviewWidth + gap) : container.width
  const availableWidth = Math.max(0, layoutWidth - gap)
  const availablePreviewWidth = Math.max(0, availableWidth - minCodeWidth)
  const portraitPreviewWidth = getPortraitPreviewWidthForHeight(container.height, viewport) + portraitExtraWidth
  const maxPreviewWidth =
    layout === 'focused'
      ? availablePreviewWidth
      : layout === 'portrait'
        ? Math.min(availablePreviewWidth, portraitPreviewWidth)
        : Math.min(availablePreviewWidth, getPreviewWidthForArea(viewport, maxPreviewArea))
  const clampedMinPreviewWidth = Math.min(minPreviewWidth, maxPreviewWidth)
  const defaultPreviewWidth =
    layout === 'focused'
      ? Math.max(660, availableWidth * (3 / 6.5))
      : layout === 'portrait'
        ? maxPreviewWidth
        : Math.min(getBasePreviewViewportWidth(viewport) + previewPaddingWidth, maxPreviewWidth)
  const previewWidth = Math.max(clampedMinPreviewWidth, Math.min(maxPreviewWidth, defaultPreviewWidth))
  return {
    previewWidth,
    codeWidth: availableWidth - previewWidth
  }
}
