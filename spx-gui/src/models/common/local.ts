import localforage from 'localforage'
import type { Metadata } from '../project'
import { File, type Files, type Metadata as FileMetadata } from './file'

const storage = localforage.createInstance({
  name: 'spx-gui',
  storeName: 'project'
})

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

export async function clear(key: string) {
  const metadataEx = await getMetadataEx(key)
  if (metadataEx == null) return
  await Promise.all([removeMetadataEx(key), ...metadataEx.files.map((path) => removeFile(key, path))])
}

export async function load(key: string) {
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

export async function save(key: string, { thumbnail, ...metadata }: Metadata, files: Files, signal?: AbortSignal) {
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
