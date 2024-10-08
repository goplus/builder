/**
 * @file class File
 * @desc File-like class, while load lazily.
 *       Files are expected to be immutable. Everytime you want to modify a file, create a new instance.
 */

import { markRaw } from 'vue'
import { getMimeFromExt } from '@/utils/file'
import { extname } from '@/utils/path'
import type { Disposer } from '@/utils/disposable'
import { Cancelled } from '@/utils/exception'

export type Options = {
  /** MIME type of file */
  type?: string
  // TODO: lastModified, endings
}

export type Metadata = {
  universalUrl?: string
  hash?: string
}

export type Loader = () => Promise<ArrayBuffer>

/** File-like class, while load lazily */
export class File {
  /** MIME type of file */
  type: string

  /**
   * Metadata related to current file.
   * If you want to save data during the file's lifetime (including serialization & deserialization), put it here.
   * It's ok to read & write this field directly as long as you are clear about what you are doing.
   */
  meta: Metadata = {}

  constructor(
    /** File name */
    public name: string,
    /** Loader for file content */
    private loader: Loader,
    options?: Options
  ) {
    this.type = options?.type ?? getMimeFromExt(extname(name).slice(1)) ?? ''
    markRaw(this)
  }

  private content: ArrayBuffer | null = null
  private promisedContent: Promise<ArrayBuffer> | null = null

  async arrayBuffer() {
    if (this.content != null) return this.content
    if (this.promisedContent != null) return this.promisedContent
    return (this.promisedContent = this.loader().then((ab) => {
      return (this.content = ab)
    }))
  }

  async url(onCleanup: (disposer: Disposer) => void) {
    let cancelled = false
    onCleanup(() => (cancelled = true))
    const ab = await this.arrayBuffer()
    if (cancelled) throw new Cancelled()
    const url = URL.createObjectURL(new Blob([ab], { type: this.type }))
    onCleanup(() => URL.revokeObjectURL(url))
    return url
  }
}

/**
 * Map from relative path to `File` instance
 * Relative path starts with slash, e.g. `index.json`
 */
export type Files = {
  [path: string]: File | undefined
}

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

export const isText = (() => {
  const types = ['application/json']
  return (file: File) => file.type.startsWith('text/') || types.includes(file.type)
})()

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
