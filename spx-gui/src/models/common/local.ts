import localforage from 'localforage'
import type { Metadata, IProject } from '../project'
import { File, type Files, type Metadata as FileMetadata } from './file'

const storage = localforage.createInstance({
  name: 'spx-gui',
  storeName: 'project'
})

/** Helpers for local storage (IndexedDB based) of project data. */
export class LocalHelpers {
  /**
   * Load project from local storage by given storage key.
   * Resolves with `false` if no data found.
   * Resolves with `true` if data loaded successfully.
   */
  async load(project: IProject, key: string): Promise<boolean> {
    const loaded = await load(key)
    if (loaded == null) return false
    const { metadata, files } = loaded
    await project.load(metadata, files)
    return true
  }

  /** Save project to local storage with given storage key. */
  async save(project: IProject, key: string, signal?: AbortSignal) {
    const [metadata, files] = await project.export(signal)
    await save(key, metadata, files, signal)
  }

  /** Clear data in local storage with given storage key. */
  async clear(key: string) {
    await clear(key)
  }
}

export const localHelpers = new LocalHelpers()

type MetadataEx = Omit<Metadata, 'thumbnail'> & {
  files: string[]
  // `?`(`undefined`) for compatibility with legacy data
  thumbnail?: RawFile | null
}

type RawFile = {
  name: string
  type: string
  lastModified: number
  content: ArrayBuffer
  meta?: FileMetadata
}

async function getMetadataEx(key: string) {
  const metadataEx = await storage.getItem(key)
  if (metadataEx == null) return null
  return metadataEx as MetadataEx
}

async function setMetadataEx(key: string, metadataEx: MetadataEx) {
  await storage.setItem(key, metadataEx)
}

async function removeMetadataEx(key: string) {
  await storage.removeItem(key)
}

function fromRawFile({ name, content, ...options }: RawFile): File {
  return new File(name, async () => content, options)
}

async function toRawFile(file: File, signal?: AbortSignal): Promise<RawFile> {
  const content = await file.arrayBuffer(signal)
  return {
    name: file.name,
    type: file.type,
    lastModified: file.lastModified,
    meta: file.meta,
    content
  }
}

async function readFile(key: string, path: string): Promise<File> {
  const rawFile = await storage.getItem(`${key}/${path}`)
  if (rawFile == null) throw new Error('file not found in storage')
  return fromRawFile(rawFile as RawFile)
}

async function writeFile(key: string, path: string, file: File, signal?: AbortSignal) {
  const rawFile = await toRawFile(file, signal)
  await storage.setItem(`${key}/${path}`, rawFile)
}

async function removeFile(key: string, path: string) {
  await storage.removeItem(`${key}/${path}`)
}

async function clear(key: string) {
  const metadataEx = await getMetadataEx(key)
  if (metadataEx == null) return
  await Promise.all([removeMetadataEx(key), ...metadataEx.files.map((path) => removeFile(key, path))])
}

async function load(key: string) {
  // TODO: check project owner & name
  const metadataEx = await getMetadataEx(key)
  if (metadataEx == null) return null
  const { files: fileList, thumbnail: rawThumbnail, ...metadata } = metadataEx
  const files: Files = {}
  await Promise.all(
    fileList.map(async (path) => {
      files[path] = await readFile(key, path)
    })
  )
  let thumbnail: File | null = null
  if (rawThumbnail != null) thumbnail = fromRawFile(rawThumbnail)
  return {
    metadata: {
      ...metadata,
      thumbnail
    },
    files
  }
}

async function save(key: string, { thumbnail, ...metadata }: Metadata, files: Files, signal?: AbortSignal) {
  await clear(key)
  const fileList = Object.keys(files)
  let rawThumbnail: RawFile | null = null
  if (thumbnail != null) rawThumbnail = await toRawFile(thumbnail, signal)
  const metadataEx: MetadataEx = { ...metadata, thumbnail: rawThumbnail, files: fileList }
  await Promise.all([
    setMetadataEx(key, metadataEx),
    ...fileList.map((path) => writeFile(key, path, files[path]!, signal))
  ])
}
