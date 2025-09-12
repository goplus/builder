import { Disposable } from '@/utils/disposable'

/** Convert arbitrary-type (supported by current browser) image content to another type. */
export function convertImg(
  /** Input image */
  input: Blob,
  /** Mime type of the output image, see details in https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob#type */
  type: string
) {
  const d = new Disposable()
  return new Promise<Blob>((resolve, reject) => {
    const img = new Image()
    img.onload = async () => {
      let size = { width: img.naturalWidth, height: img.naturalHeight }
      if (input.type === 'image/svg+xml') {
        const svgText = await input.text()
        size = await getSVGSize(svgText)
      }
      const canvas = new OffscreenCanvas(size.width, size.height)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, size.width, size.height)
      resolve(canvas.convertToBlob({ type }))
    }
    img.onerror = (e) => reject(new Error(`load image failed: ${e.toString()}`))
    const url = URL.createObjectURL(input)
    d.addDisposer(() => URL.revokeObjectURL(url))
    img.src = url
  }).finally(() => {
    d.dispose()
  })
}

/** Convert arbitrary-type (supported by current browser) image content to type-`image/jpeg` content. */
export function toJpeg(blob: Blob) {
  return convertImg(blob, 'image/jpeg')
}

/** Convert arbitrary-type (supported by current browser) image content to type-`image/png` content. */
export async function toPng(blob: Blob) {
  return convertImg(blob, 'image/png')
}

// Chrome and Firefox behave differently when reading `viewBox.baseVal` of SVG without the `viewBox` attribute.
// Chrome returns `{ x: 0, y: 0, width: 0, height: 0 }` by default, while Firefox returns null.
// This method retrieves the `viewBox` attribute, ensuring consistent behavior when it exists, and returns `{ x: 0, y: 0, width: 0, height: 0 }` when it doesn't exist.
function getSVGViewBoxRect(svgElement: SVGSVGElement) {
  const rect = svgElement.viewBox.baseVal as DOMRect | null // `viewBox.baseVal` may be null in Firefox if not set in SVG
  return {
    width: rect?.width ?? 0,
    height: rect?.height ?? 0,
    x: rect?.x ?? 0,
    y: rect?.y ?? 0
  }
}

/** Get the size of the SVG image, keeping consistent with spx. */
export async function getSVGSize(svgText: string) {
  const parser = new DOMParser()
  const svg = parser.parseFromString(svgText, 'image/svg+xml').documentElement
  if (!(svg instanceof SVGSVGElement)) throw new Error('invalid svg')
  // Keep consistent with spx, for details see:
  // * https://github.com/goplus/spx/blob/15b2e572746f3aaea519c2d9c0027188b50b62c8/internal/svgr/svg.go#L39
  // * https://github.com/qiniu/oksvg/blob/917f53935572252ba3da8909ca4fbedec418bde1/svgd.go#L1015-L1049
  let { width, height } = getSVGViewBoxRect(svg)
  if (width === 0) width = svg.width.baseVal.value
  if (height === 0) height = svg.height.baseVal.value
  return { width, height }
}
