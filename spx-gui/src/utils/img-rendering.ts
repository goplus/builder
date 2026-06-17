/**
 * Rendering adapter for image `File`s. Low-level image processing helpers live in `utils/img.ts`.
 */

import { computed, ref, watch, type WatchSource } from 'vue'
import { isSvgMimeType } from '@/utils/file'
import { Cancelled } from '@/utils/exception'
import type { File } from '@/models/common/file'
import { injectScratchFontsToSvgText } from './scratch-svg-font'

/** Cache for derived rendering SVG blobs with Scratch fonts injected (if needed), keyed by source `File`. */
const derivedSvgCache = new WeakMap<File, Promise<Blob>>()

/**
 * Get an image-resource URL for a `File`.
 * SVG files that use Scratch fonts are rendered through a derived blob URL with embedded font faces.
 */
export async function getRenderableImageUrl(file: File, signal: AbortSignal) {
  if (!isSvgMimeType(file.type)) return file.url(signal)

  // SVGs rendered as image resources cannot see page-level font faces, so Scratch fonts must be embedded
  // in the derived rendering blob. The source `File` content stays unchanged.
  let derivedSvgPromise = derivedSvgCache.get(file)
  if (derivedSvgPromise == null) {
    derivedSvgPromise = file
      .arrayBuffer()
      .then(async (ab) => {
        const svgText = new TextDecoder().decode(ab)
        const injectedSvgText = await injectScratchFontsToSvgText(svgText)
        return new Blob([injectedSvgText ?? ab], { type: 'image/svg+xml' })
      })
      .catch((e) => {
        derivedSvgCache.delete(file)
        throw e
      })
    derivedSvgCache.set(file, derivedSvgPromise)
  }
  const derivedSvg = await derivedSvgPromise
  signal.throwIfAborted()
  const url = URL.createObjectURL(derivedSvg)
  signal.addEventListener('abort', () => URL.revokeObjectURL(url), { once: true })
  return url
}

/** Reactive image-resource URL for a `File`, with SVG-specific rendering fixes when needed. */
export function useRenderableImageUrl(fileSource: WatchSource<File | undefined | null>) {
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
      const ctrl = new AbortController()
      onCleanup(() => {
        ctrl.abort(new Cancelled('cleanup'))
        urlRef.value = null
        loadingRef.value = false
      })
      getRenderableImageUrl(file, ctrl.signal)
        .then((url) => {
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

/** Reactive loaded `HTMLImageElement` for canvas-style consumers. */
export function useRenderableImage(fileSource: WatchSource<File | undefined | null>) {
  const [urlRef, urlLoadingRef] = useRenderableImageUrl(fileSource)
  const imgRef = ref<HTMLImageElement | null>(null)
  const imgLoadingRef = ref(false)

  watch(urlRef, (url, _, onCleanup) => {
    const ctrl = new AbortController()
    onCleanup(() => {
      ctrl.abort(new Cancelled('cleanup'))
      imgRef.value?.remove()
      imgRef.value = null
      imgLoadingRef.value = false
    })
    if (url == null) return
    imgLoadingRef.value = true
    const img = new Image()
    img.addEventListener(
      'load',
      () => {
        if (ctrl.signal.aborted) return
        imgRef.value = img
        imgLoadingRef.value = false
      },
      { once: true }
    )
    img.addEventListener(
      'error',
      () => {
        if (ctrl.signal.aborted) return
        imgLoadingRef.value = false
      },
      { once: true }
    )
    img.src = url
  })

  const loading = computed(() => urlLoadingRef.value || imgLoadingRef.value)
  return [imgRef, loading] as const
}
