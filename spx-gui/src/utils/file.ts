import { computed, ref, watch, type WatchSource } from 'vue'
import type { File } from '@/models/common/file'
import { Cancelled, DefaultException } from './exception'

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

export const imgExts = ['png', 'jpg', 'jpeg', 'svg', 'webp']
export const audioExts = ['wav', 'mp3', 'ogg', 'webm']

export type FileSelectOptions = {
  accept?: string
  multiple?: boolean
}

const maxFileSize = 25 << 20 // 25 MiB
function _selectFile({ accept = '', multiple = false }: FileSelectOptions) {
  return new Promise<globalThis.File[]>((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
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
      // TODO: we should not check size for `.gbp` or scratch files
      const oversizedFileNames = Array.from(input.files!)
        .filter((file) => file.size > maxFileSize)
        .map((file) => file.name)
      if (oversizedFileNames.length > 0) {
        reject(
          new DefaultException({
            en: `File ${oversizedFileNames.join(', ')} size exceeds limit (max ${maxFileSize} bytes)`,
            zh: `文件 ${oversizedFileNames.join(', ')} 尺寸超限（最大 ${maxFileSize} 字节）`
          })
        )
      } else {
        resolve(Array.from(input.files!))
      }
      settled = true
    }
    input.click()
  })
}

/** Let the user select single file */
export async function selectFile(options?: Omit<FileSelectOptions, 'multiple'>) {
  const files = await _selectFile({ ...options, multiple: false })
  return files[0]
}

/** Let the user select multiple files */
export function selectFiles(options?: Omit<FileSelectOptions, 'multiple'>) {
  return _selectFile({ ...options, multiple: true })
}

/** Let the user select single image */
export function selectImg() {
  const accept = imgExts.map((ext) => `.${ext}`).join(',')
  return selectFile({ accept })
}

/** Let the user select multiple images */
export function selectImgs() {
  const accept = imgExts.map((ext) => `.${ext}`).join(',')
  return selectFiles({ accept })
}

/** Get audio exts of formats that current browser support (to decode / play) */
async function getSupportedAudioExts() {
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

/** Let the user select single audio file (supported by spx) */
export async function selectAudio() {
  const supportedExts = await getSupportedAudioExts()
  const accept = supportedExts.map((ext) => `.${ext}`).join(',')
  return selectFile({ accept })
}

/** Get url for File */
export function useFileUrl(fileSource: WatchSource<File | undefined>) {
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
      file
        .url(onCleanup)
        .then((url) => {
          urlRef.value = url
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
