/**
 * @file class File
 * @desc File-like class, while load lazily from network
 *       Note that we do not defer loading from disk, cause disk-reading & memory-usage seem not to be the bottleneck now.
 *       If needed, we can adjust class `File` here to defer loading from disk, too.
 */

import { getMimeFromExt } from "@/util/file"
import { extname } from "@/util/path"

export type Options = {
  /** MIME type of file */
  type?: string
  // TODO: lastModified, endings
}

/** File-like class, while load lazily from network */
export class File {

  /** File content */
  content: ArrayBuffer | null = null
  /** MIME type of file */
  type: string = ''

  constructor(
    /** File name */
    public name: string,
    /** Public URL */
    public publicUrl: string | null = null,
    /** In-memory content */
    content: ArrayBuffer | null = null,
    options?: Options
  ) {
    if (content != null) this.content = content
    if (options != null) this.type = options.type ?? getMimeFromExt(extname(name).slice(1))
  }

  _promisedContent: Promise<ArrayBuffer> | null = null

  async _load() {
    if (this.publicUrl == null) throw new Error('file url expected')
    const resp = await fetch(this.publicUrl)
    const blob = await resp.blob()
    return blob.arrayBuffer()
  }

  async arrayBuffer() {
    if (this.content != null) return this.content
    if (this._promisedContent != null) return this._promisedContent
    return this._promisedContent = this._load().then(ab => {
      return this.content = ab
    })
  }

  // TODO: remember to do URL.revokeObjectURL
  url() {
    if (this.publicUrl != null) return this.publicUrl
    const ab = this.content!
    return URL.createObjectURL(new Blob([ab]))
  }

}

/**
 * Map from relative path to `File` instance
 * Relative path starts with slash, e.g. `index.json`
 */
export type Files = {
  [path: string]: File | undefined
}

export type ReadFile = (path: string) => Promise<File>

function str2Ab(str: string) {
  const encoder = new TextEncoder()
  const view = encoder.encode(str)
  return view.buffer
}

export async function fromBlob(name: string, blob: Blob) {
  const ab = await blob.arrayBuffer()
  return new File(name, null, ab, { type: blob.type })
}

export async function fromNativeFile(file: globalThis.File) {
  const ab = await file.arrayBuffer()
  return new File(file.name, null, ab, { type: file.type })
}

export async function toNativeFile(file: File) {
  const ab = await file.arrayBuffer()
  return new window.File([ab], file.name, {
    type: file.type
  })
}

export function fromText(name: string, text: string, options?: Options) {
  return new File(name, null, str2Ab(text), options)
}

export async function toText(file: File) {
  const ab = await file.arrayBuffer()
  const decoder = new TextDecoder()
  return decoder.decode(ab)
}

export function fromConfig(name: string, config: unknown, options?: Options) {
  return fromText(name, JSON.stringify(config), options)
}

export async function toConfig(file: File) {
  const text = await toText(file)
  return JSON.parse(text) as unknown
}

export function listDirs(
  files: { [path: string]: unknown },
  /** path of parent dir to do list, with no tailing slash */
  dirname: string
) {
  const dirs: string[] = []
  const prefix = dirname + '/'
  for (const filePath of Object.keys(files)) {
    if (!filePath.startsWith(prefix)) continue
    const segments = filePath.slice(prefix.length).split('/')
    if (segments.length > 1 && !dirs.includes(segments[0])) dirs.push(segments[0])
  }
  return dirs
}
