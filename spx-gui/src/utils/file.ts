import { computed, ref, watch, type WatchSource } from 'vue'
import type { File } from '@/models/common/file'
import { Cancelled } from './exception'

/**
 * Map file extension to mime type.
 */
const ext2mime: Record<string, string | undefined> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  avif: 'image/avif',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  webm: 'audio/webm',
  json: 'application/json',
  spx: 'text/plain',
  gmx: 'text/plain'
}

/**
 * Get mime type from file extension.
 * @param ext the file extension, without dot (`.`)
 * @returns the mime type
 */
export const getMimeFromExt = (ext: string) => ext2mime[ext]

const mime2Ext: Record<string, string | undefined> = Object.fromEntries(
  Object.entries(ext2mime).map(([k, v]) => [v, k])
)

/**
 * Get file extension from mime type.
 * @param mime the mime type
 * @returns the file extension, without dot (`.`)
 */
export function getExtFromMime(mime: string) {
  return mime2Ext[mime]
}

export const imgExts = ['png', 'jpg', 'jpeg', 'svg', 'webp']
export const audioExts = ['wav', 'mp3', 'ogg', 'webm']

export type FileSelectOptions = {
  /** File extensions to accept, without dot (`.`), e.g. `['png', 'jpg']` */
  accept?: string[]
}

function _selectFile({
  accept = [],
  multiple = false
}: FileSelectOptions & {
  /** Whether to allow selecting multiple files, defaults to `false` */
  multiple?: boolean
}) {
  return new Promise<globalThis.File[]>((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept.map((ext) => `.${ext}`).join(',')
    input.multiple = multiple

    let settled = false
    // focus event of window is triggered when file dialog is closed
    window.addEventListener(
      'focus',
      () => {
        setTimeout(() => {
          // change event of input not triggered (if triggered, it happens soon after focus event of window)
          if (!settled) reject(new Cancelled())
        }, 1000)
      },
      { once: true }
    )
    input.onchange = async () => {
      resolve(Array.from(input.files!))
      settled = true
    }
    input.click()
  })
}

/** Let the user select single file */
export async function selectFile(options?: FileSelectOptions) {
  const files = await _selectFile({ ...options, multiple: false })
  return files[0]
}

/** Let the user select multiple files */
export function selectFiles(options?: FileSelectOptions) {
  return _selectFile({ ...options, multiple: true })
}

/** Get audio exts of formats that current browser support (to decode / play) */
export async function getSupportedAudioExts() {
  // `audio.canPlayType` seems to be more reliable than `MediaRecorder.isTypeSupported` & `navigator.mediaCapabilities.decodingInfo`
  const audio = new Audio()
  return (
    await Promise.all(
      audioExts.map(async (ext) => {
        const mimeType = getMimeFromExt(ext)
        if (mimeType == null) return null
        return audio.canPlayType(mimeType) !== '' ? ext : null
      })
    )
  ).filter(Boolean) as string[]
}

/** Get url for File */
export function useFileUrl(fileSource: WatchSource<File | undefined | null>) {
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
      let fileUrlCleanup: (() => void) | null = null
      onCleanup(() => {
        cancelled = true
        urlRef.value = null
        fileUrlCleanup?.()
      })
      file
        .url((cleanup) => {
          if (cancelled) {
            cleanup()
            return
          }
          fileUrlCleanup = cleanup
        })
        .then((url) => {
          if (cancelled) return
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
 * Get url for File with smooth transition (no flickering)
 * This version keeps the old URL until the new one is ready
 */
export function useFileUrlSmooth(fileSource: WatchSource<File | undefined | null>) {
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
      let fileUrlCleanup: (() => void) | null = null
      onCleanup(() => {
        cancelled = true
        // Don't clear urlRef.value here - keep old URL until component unmounts
        fileUrlCleanup?.()
      })
      file
        .url((cleanup) => {
          if (cancelled) {
            cleanup()
            return
          }
          fileUrlCleanup = cleanup
        })
        .then((url) => {
          if (cancelled) return
          // Only update URL when new URL is ready
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
 * Get image element (HTMLImageElement) based on given (image) file.
 * The image element is guaranteed to be loaded when set to ref.
 */
export function useFileImg(fileSource: WatchSource<File | undefined>) {
  const [urlRef, urlLoadingRef] = useFileUrl(fileSource)
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
