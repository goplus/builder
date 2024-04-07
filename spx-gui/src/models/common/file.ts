/**
 * @file class File
 * @desc File-like class, while load lazily.
 */

import { getMimeFromExt } from '@/utils/file'
import { extname } from '@/utils/path'

export type Options = {
  /** MIME type of file */
  type?: string
  // TODO: lastModified, endings
}

export type Loader = () => Promise<ArrayBuffer>

/** File-like class, while load lazily */
export class File {
  /** MIME type of file */
  type: string = ''

  constructor(
    /** File name */
    public name: string,
    /** Loader for file content */
    public _loader: Loader,
    options?: Options
  ) {
    if (options != null) this.type = options.type ?? getMimeFromExt(extname(name).slice(1))
  }

  _content: ArrayBuffer | null = null
  _promisedContent: Promise<ArrayBuffer> | null = null

  async arrayBuffer() {
    if (this._content != null) return this._content
    if (this._promisedContent != null) return this._promisedContent
    return (this._promisedContent = this._loader().then((ab) => {
      return (this._content = ab)
    }))
  }

  // TODO: remember to do URL.revokeObjectURL
  async url() {
    const ab = await this.arrayBuffer()
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

export function fromBlob(name: string, blob: Blob) {
  return new File(name, () => blob.arrayBuffer(), { type: blob.type })
}

export function fromNativeFile(file: globalThis.File) {
  return fromBlob(file.name, file)
}

export async function toNativeFile(file: File) {
  const ab = await file.arrayBuffer()
  return new window.File([ab], file.name, {
    type: file.type
  })
}

export function fromText(name: string, text: string, options?: Options) {
  return new File(name, async () => str2Ab(text), options)
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
