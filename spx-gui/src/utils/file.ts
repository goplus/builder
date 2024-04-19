import { ref, watch, type WatchSource } from 'vue'
import type { File } from '@/models/common/file'

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
  webm: 'audio/web',
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
export const audioExts = ['wav', 'mp3', 'ogg']

export type FileSelectOptions = {
  accept?: string
  multiple?: boolean
}

function _selectFile({ accept = '', multiple = false }: FileSelectOptions) {
  return new Promise<globalThis.File[]>((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = multiple
    input.click()
    // TODO: dispose input? operation cancelled?
    input.onchange = async () => {
      resolve(Array.from(input.files!))
    }
  })
}

/** Let the user select single file */
export async function selectFile(options?: Omit<FileSelectOptions, 'multiple'>) {
  const files = await _selectFile({
    ...options,
    multiple: false
  })
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

/** Let the user select single audio file */
export function selectAudio() {
  const accept = audioExts.map((ext) => `.${ext}`).join(',')
  return selectFile({ accept })
}

/** Get url for File */
export function useFileUrl(fileSource: WatchSource<File | undefined>) {
  const urlRef = ref<string | null>(null)
  watch(
    fileSource,
    (file, _, onCleanup) => {
      if (file == null) return
      file.url(onCleanup).then((url) => {
        urlRef.value = url
      })
    },
    { immediate: true }
  )
  return urlRef
}

export function useImgFile(fileSource: WatchSource<File | undefined>) {
  const urlRef = useFileUrl(fileSource)
  const imgRef = ref<HTMLImageElement | null>(null)
  watch(urlRef, (url, _, onCleanup) => {
    onCleanup(() => {
      imgRef.value?.remove()
      imgRef.value = null
    })
    if (url != null) {
      const img = new window.Image()
      img.src = url
      imgRef.value = img
    }
  })
  return imgRef
}
