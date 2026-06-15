import { computed, ref, watch, type WatchSource } from 'vue'
import { Disposable } from '@/utils/disposable'
import { isSvgMimeType } from '@/utils/file'
import type { File } from '@/models/common/file'
import { Cancelled } from '@/utils/exception'
import { getImgDrawingCtx } from './canvas'
import { injectScratchFontsIntoSvg } from './scratch-font'

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
      if (isSvgMimeType(input.type)) {
        const svgText = await input.text()
        size = await getSVGSize(svgText)
      }
      const canvas = new OffscreenCanvas(size.width, size.height)
      const ctx = getImgDrawingCtx(canvas)
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
function getSVGViewBoxRectFromElement(svgElement: SVGSVGElement) {
  const rect = svgElement.viewBox.baseVal as DOMRect | null // `viewBox.baseVal` may be null in Firefox if not set in SVG
  return {
    width: rect?.width ?? 0,
    height: rect?.height ?? 0,
    x: rect?.x ?? 0,
    y: rect?.y ?? 0
  }
}

function parseSVGText(svgText: string) {
  const parser = new DOMParser()
  const svg = parser.parseFromString(svgText, 'image/svg+xml').documentElement
  if (!(svg instanceof SVGSVGElement)) throw new Error('invalid svg')
  return svg
}

export function getSVGViewBoxRect(svgText: string) {
  return getSVGViewBoxRectFromElement(parseSVGText(svgText))
}

/** Get the size of the SVG image, keeping consistent with spx. */
export async function getSVGSize(svgText: string) {
  const svg = parseSVGText(svgText)
  // Keep consistent with spx, for details see:
  // * https://github.com/goplus/spx/blob/15b2e572746f3aaea519c2d9c0027188b50b62c8/internal/svgr/svg.go#L39
  // * https://github.com/qiniu/oksvg/blob/917f53935572252ba3da8909ca4fbedec418bde1/svgd.go#L1015-L1049
  let { width, height } = getSVGViewBoxRectFromElement(svg)
  if (width === 0) width = svg.width.baseVal.value
  if (height === 0) height = svg.height.baseVal.value
  return { width, height }
}

export type Rect = {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Get the bounding rectangle of the non-transparent content of an image.
 * The returned rectangle is relative to the top-left corner of the image.
 * If the image is fully transparent, empty rectangle (`{ x: 0, y: 0, width: 0, height: 0 }`) will be returned.
 */
export async function getContentBoundingRect(imgBlob: Blob): Promise<Rect> {
  const d = new Disposable()
  return new Promise<Rect>((resolve, reject) => {
    const img = new Image()
    img.onload = async () => {
      try {
        let size = { width: img.naturalWidth, height: img.naturalHeight }
        if (isSvgMimeType(imgBlob.type)) {
          const svgText = await imgBlob.text()
          size = await getSVGSize(svgText)
        }
        const canvas = new OffscreenCanvas(size.width, size.height)
        const ctx = getImgDrawingCtx(canvas)
        ctx.drawImage(img, 0, 0, size.width, size.height)

        const imageData = ctx.getImageData(0, 0, size.width, size.height)
        const bounds = findContentBounds(imageData)
        resolve(bounds)
      } catch (error) {
        reject(error)
      }
    }
    img.onerror = (e) => reject(new Error(`load image failed: ${e.toString()}`))
    const url = URL.createObjectURL(imgBlob)
    d.addDisposer(() => URL.revokeObjectURL(url))
    img.src = url
  }).finally(() => d.dispose())
}

const emptyRect: Rect = { x: 0, y: 0, width: 0, height: 0 }

function findContentBounds(imageData: ImageData): Rect {
  const { data, width, height } = imageData
  if (width === 0 || height === 0) return emptyRect

  // Scan all pixels to find bounds of non-transparent content
  let minX = width,
    minY = height,
    maxX = -1,
    maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3] // Alpha channel
      if (alpha > 0) {
        // Non-transparent pixel
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  // No non-transparent pixels found
  if (maxX === -1) return emptyRect

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  }
}

/**
 * Get a display URL for an image file, with Scratch built-in font injection for SVG assets.
 *
 * SVG blobs loaded as CSS background-image or <img src> cannot reference external resources
 * (including page-level @font-face definitions). This composable handles SVG files by reading
 * their text content, embedding required Scratch font data as inline @font-face data URIs, and
 * creating a new blob URL from the modified SVG. Non-SVG files get a plain blob URL as usual.
 *
 * Use this composable in rendering contexts (costume previews, backdrop previews, sprite
 * thumbnails) that display image assets and need correct Scratch font rendering in edit mode.
 * For non-image files (audio, JSON) continue using `useFileUrl` from `@/utils/file`.
 */
export function useImgFileUrl(fileSource: WatchSource<File | undefined | null>) {
  const urlRef = ref<string | null>(null)
  const loadingRef = ref(false)

  watch(
    fileSource,
    (file, _, onCleanup) => {
      if (file == null) {
        urlRef.value = null
        return
      }
      loadingRef.value = true
      let cancelled = false
      let revokeUrl: (() => void) | null = null

      onCleanup(() => {
        cancelled = true
        urlRef.value = null
        revokeUrl?.()
      })

      const run = async () => {
        if (!isSvgMimeType(file.type)) {
          // Non-SVG: delegate to the standard file URL mechanism.
          return file.url((cleanup) => {
            if (cancelled) {
              cleanup()
              return
            }
            revokeUrl = cleanup
          })
        }

        // SVG: read the text, inject Scratch fonts, create a new blob URL.
        const ab = await file.arrayBuffer()
        if (cancelled) return null
        const svgText = new TextDecoder().decode(ab)
        const injected = await injectScratchFontsIntoSvg(svgText)
        if (cancelled) return null
        const blob = new Blob([injected], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        revokeUrl = () => URL.revokeObjectURL(url)
        return url
      }

      run()
        .then((url) => {
          if (cancelled || url == null) return
          urlRef.value = url
        })
        .catch((e) => {
          if (e instanceof Cancelled) return
          throw e
        })
        .finally(() => {
          loadingRef.value = false
        })
    },
    { immediate: true }
  )

  return [urlRef, loadingRef] as const
}

/**
 * Get an HTMLImageElement for an image file, with Scratch built-in font injection for SVG assets.
 * Behaves like `useFileImg` from `@/utils/file` but uses `useImgFileUrl` internally so SVG
 * costumes and backdrops with Scratch fonts render correctly in canvas (Konva) contexts.
 */
export function useImgFileImg(fileSource: WatchSource<File | undefined | null>) {
  const [urlRef, urlLoadingRef] = useImgFileUrl(fileSource)
  const imgRef = ref<HTMLImageElement | null>(null)
  const imgLoadingRef = ref(false)
  watch(urlRef, (url, _, onCleanup) => {
    onCleanup(() => {
      imgRef.value?.remove()
      imgRef.value = null
    })
    if (url != null) {
      imgLoadingRef.value = true
      const img = new window.Image()
      img.addEventListener(
        'load',
        () => {
          imgRef.value = img
          imgLoadingRef.value = false
        },
        { once: true }
      )
      img.addEventListener(
        'error',
        () => {
          imgLoadingRef.value = false
        },
        { once: true }
      )
      img.src = url
    }
  })
  const loading = computed(() => urlLoadingRef.value || imgLoadingRef.value)
  return [imgRef, loading] as const
}
