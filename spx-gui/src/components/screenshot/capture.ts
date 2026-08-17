import { domToBlob } from 'modern-screenshot'

export interface ViewportCapture {
  blob: Blob
  width: number
  height: number
}

const captureScale = 1
const captureResourceTimeout = 1000

function isVisibleInViewport(element: Element) {
  const rect = element.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return true
  return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth
}

function shouldIncludeInCapture(node: Node) {
  if (!(node instanceof Element)) return true
  if (node instanceof HTMLElement && node.dataset.screenshotIgnore != null) return false
  if (node.classList.contains('bg-overlay-modal')) return false
  if (node.closest('.ui-modal-surface') != null) return false
  return isVisibleInViewport(node)
}

export async function captureViewport(root: HTMLElement = document.body): Promise<ViewportCapture> {
  const width = window.innerWidth
  const height = window.innerHeight
  const rootBackgroundColor = getComputedStyle(root).backgroundColor

  const blob = await domToBlob(root, {
    width,
    height,
    scale: captureScale,
    backgroundColor: rootBackgroundColor === 'rgba(0, 0, 0, 0)' ? '#ffffff' : rootBackgroundColor,
    style: {
      margin: '0',
      padding: '0'
    },
    filter: shouldIncludeInCapture,
    timeout: captureResourceTimeout,
    features: {
      restoreScrollPosition: true
    }
  })

  return { blob, width, height }
}
