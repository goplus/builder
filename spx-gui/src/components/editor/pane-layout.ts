export type EditorLayout = 'landscape' | 'portrait' | 'focused'

type Size = { width: number; height: number }

export function getPaneLayout(
  container: Size,
  viewport: Size,
  layout: EditorLayout,
  preferredCodeWidth: number | null
) {
  const gap = 16
  const minCodeWidth = 384
  const minPreviewWidth = 320
  const previewChromeHeight = 72
  const previewPaddingWidth = 24
  const bottomPanelsHeight = 200
  const layoutWidth =
    layout === 'portrait' ? Math.max(container.width, minCodeWidth + minPreviewWidth + gap) : container.width
  const availableWidth = Math.max(0, layoutWidth - gap)
  const availablePreviewWidth = Math.max(0, availableWidth - minCodeWidth)
  const ratio = viewport.width / viewport.height
  const stackedWidth =
    Math.max(0, container.height - previewChromeHeight - gap - bottomPanelsHeight) * ratio + previewPaddingWidth
  const requestedPreviewWidth = Math.max(
    0,
    Math.min(
      availablePreviewWidth,
      preferredCodeWidth == null ? availablePreviewWidth : availableWidth - preferredCodeWidth
    )
  )
  const maxPreviewWidth = layout === 'focused' ? availablePreviewWidth : Math.min(availablePreviewWidth, stackedWidth)
  const clampedMinPreviewWidth = Math.min(minPreviewWidth, maxPreviewWidth)
  const defaultPreviewWidth =
    layout === 'focused'
      ? Math.max(660, availableWidth * (3 / 6.5))
      : layout === 'portrait'
        ? maxPreviewWidth
        : Math.min(640, Math.max(360, container.width * 0.4), maxPreviewWidth)
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
