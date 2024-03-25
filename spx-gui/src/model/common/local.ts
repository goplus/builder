import localforage from 'localforage'
import { File, type Files } from './file'
import type { Metadata } from '../project'

const storage = localforage.createInstance({
  name: 'spx-gui',
  storeName: 'project'
})

type MetadataEx = Metadata & {
  files: string[]
}

type RawFile = {
  name: string
  publicUrl: string | null
  content: ArrayBuffer | null
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

async function readFile(key: string, path: string): Promise<File> {
  const rawFile = await storage.getItem(`${key}/${path}`)
  if (rawFile == null) throw new Error('file not found in storage')
  const { name, publicUrl, content } = rawFile as RawFile
  return new File(name, publicUrl, content)
}

async function writeFile(key: string, path: string, file: File) {
  const rawFile: RawFile = {
    name: file.name,
    publicUrl: file.publicUrl,
    // content may not be ready (not downloaded yet), but it's ok.
    // we dont need to ensure file content cached. URL is enough.
    content: file.content
  }
  await storage.setItem(`${key}/${path}`, rawFile)
}

async function removeFile(key: string, path: string) {
  await storage.removeItem(`${key}/${path}`)
}

async function clear(key: string) {
  const metadataEx = await getMetadataEx(key)
  if (metadataEx == null) return
  await Promise.all([
    removeMetadataEx(key),
    ...metadataEx.files.map(path => removeFile(key, path))
  ])
}

export async function load(key: string) {
  // TODO: check project owner & name
  const metadataEx = await getMetadataEx(key)
  if (metadataEx == null) return null
  const { files: fileList, ...metadata } = metadataEx
  const files: Files = {}
  await Promise.all(fileList.map(async path => {
    files[path] = await readFile(key, path)
  }))
  return { metadata, files }
}

export async function save(key: string, metadata: Metadata, files: Files) {
  await clear(key)
  const fileList = Object.keys(files)
  const metadataEx = { ...metadata, files: fileList }
  await Promise.all([
    setMetadataEx(key, metadataEx),
    ...fileList.map(path => writeFile(key, path, files[path]!))
  ])
}
