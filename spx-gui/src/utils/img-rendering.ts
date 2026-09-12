/**
 * Rendering adapter for image `File`s. Low-level image processing helpers live in `utils/img.ts`.
 */

import {
  computed,
  inject,
  provide,
  ref,
  shallowRef,
  watch,
  type InjectionKey,
  type ShallowRef,
  type WatchSource
} from 'vue'
import { isSvgMimeType } from '@/utils/file'
import { Cancelled } from '@/utils/exception'
import type { File } from '@/models/common/file'
import { createSvgRenderer, type SvgRenderer } from './resvg'
import { applyFontPreferencesToSvgText } from './svg-font'

export type SvgFontConfig = {
  fontPreferences: string[]
  fonts: Map<string, File>
}

function arrayEq(a: readonly unknown[], b: readonly unknown[]) {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

function configEq(c1: SvgFontConfig, c2: SvgFontConfig) {
  if (!arrayEq(c1.fontPreferences, c2.fontPreferences)) return false
  if (c1.fonts.size !== c2.fonts.size) return false
  for (const [name, file1] of c1.fonts) {
    const file2 = c2.fonts.get(name)
    if (file1 !== file2) return false
  }
  return true
}

class SvgFontContext {
  private cache = new WeakMap<File, Promise<Blob>>()
  private renderer: Promise<SvgRenderer> | null = null
  constructor(private config: SvgFontConfig) {}

  private getRenderer() {
    if (this.renderer == null) {
      this.renderer = createSvgRenderer(this.config.fonts).catch((error) => {
        this.renderer = null
        throw error
      })
    }
    return this.renderer
  }

  getRenderedImage(file: File): Promise<Blob> {
    const cached = this.cache.get(file)
    if (cached != null) return cached

    const promise = file
      .arrayBuffer()
      .then(async (ab) => {
        const svgText = new TextDecoder().decode(ab)
        const renderedSvgText = applyFontPreferencesToSvgText(svgText, this.config.fontPreferences)
        const png = (await this.getRenderer()).render(renderedSvgText)
        return new Blob([new Uint8Array(png)], { type: 'image/png' })
      })
      .catch((e) => {
        this.cache.delete(file)
        throw e
      })
    this.cache.set(file, promise)
    return promise
  }
}

const svgFontContextKey: InjectionKey<ShallowRef<SvgFontContext>> = Symbol('svg-font-context')

/**
 * Provides SVG font rendering configuration. The source must return a new immutable config whenever
 * its font preferences or files change.
 */
export function provideSvgFontContext(fontConfigSource: WatchSource<SvgFontConfig>) {
  const ctxRef = shallowRef<SvgFontContext>() as ShallowRef<SvgFontContext>
  watch(
    fontConfigSource,
    (config, oldConfig) => {
      if (oldConfig != null && configEq(config, oldConfig)) return
      ctxRef.value = new SvgFontContext(config)
    },
    { immediate: true }
  )
  provide(svgFontContextKey, ctxRef)
}

function useSvgFontContext(): ShallowRef<SvgFontContext | null> {
  const ctxRef = inject(svgFontContextKey)
  return ctxRef ?? shallowRef(null)
}

/**
 * Get an image-resource URL for a `File`.
 * SVG files are rasterized with their project font faces.
 */
export async function getFontAwareImageUrl(file: File, fontContext: SvgFontContext | null, signal: AbortSignal) {
  if (!isSvgMimeType(file.type) || fontContext == null) return file.url(signal)

  const renderedImage = await fontContext.getRenderedImage(file)
  signal.throwIfAborted()
  const url = URL.createObjectURL(renderedImage)
  signal.addEventListener('abort', () => URL.revokeObjectURL(url), { once: true })
  return url
}

/** Reactive image-resource URL for a `File`, with SVG-specific rendering fixes when needed. */
export function useFontAwareImageUrl(fileSource: WatchSource<File | undefined | null>) {
  const fontContext = useSvgFontContext()
  const urlRef = ref<string | null>(null)
  const loadingRef = ref(false)

  watch(
    [fileSource, fontContext] as const,
    ([file, ctx], _, onCleanup) => {
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
      getFontAwareImageUrl(file, ctx, ctrl.signal)
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
export function useFontAwareImage(fileSource: WatchSource<File | undefined | null>) {
  const [urlRef, urlLoadingRef] = useFontAwareImageUrl(fileSource)
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
