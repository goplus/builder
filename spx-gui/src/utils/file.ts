/**
 * Map file extension to mime type.
 */
const ext2mime: Record<string, string> = {
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
  json: 'application/json',
  spx: 'text/plain',
  gmx: 'text/plain'
}

/**
 * Get mime type from file extension.
 * @param ext the file extension, without dot (`.`)
 * @returns the mime type
 */
export const getMimeFromExt = (ext: string) => ext2mime[ext] || 'unknown'

export const imgExts = ['png', 'jpg', 'jpeg', 'svg', 'webp']

export type FileSelectOptions = {
  accept?: string
  multiple?: boolean
}

function _selectFile({ accept = '', multiple = false }: FileSelectOptions) {
  return new Promise<File[]>((resolve) => {
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

/** Let the user select multiple images */
export function selectImgs() {
  const accept = imgExts.map((ext) => `.${ext}`).join(',')
  return selectFiles({ accept })
}
