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
  content: ArrayBuffer
}

const LOCAL_CACHE_KEY = 'GOPLUS_BUILDER_CACHED_PROJECT'

async function getMetadataEx() {
  const metadataEx = await storage.getItem(LOCAL_CACHE_KEY)
  if (metadataEx == null) return null
  return metadataEx as MetadataEx
}

async function setMetadataEx(metadataEx: MetadataEx) {
  await storage.setItem(LOCAL_CACHE_KEY, metadataEx)
}

async function removeMetadataEx() {
  await storage.removeItem(LOCAL_CACHE_KEY)
}

async function readFile(path: string): Promise<File> {
  const rawFile = await storage.getItem(`${LOCAL_CACHE_KEY}/${path}`)
  if (rawFile == null) throw new Error('file not found in storage')
  const { name, content } = rawFile as RawFile
  return new File(name, async () => content)
}

async function writeFile(path: string, file: File) {
  const content = await file.arrayBuffer()
  const rawFile: RawFile = { name: file.name, content }
  await storage.setItem(`${LOCAL_CACHE_KEY}/${path}`, rawFile)
}

async function removeFile(path: string) {
  await storage.removeItem(`${LOCAL_CACHE_KEY}/${path}`)
}

export async function clear() {
  const metadataEx = await getMetadataEx()
  if (metadataEx == null) return
  await Promise.all([removeMetadataEx(), ...metadataEx.files.map((path) => removeFile(path))])
}

export async function load() {
  // TODO: check project owner & name
  const metadataEx = await getMetadataEx()
  if (metadataEx == null) return null
  const { files: fileList, ...metadata } = metadataEx
  const files: Files = {}
  await Promise.all(
    fileList.map(async (path) => {
      files[path] = await readFile(path)
    })
  )
  return { metadata, files }
}

export async function save(metadata: Metadata, files: Files) {
  await clear()
  const fileList = Object.keys(files)
  const metadataEx = { ...metadata, files: fileList }
  await Promise.all([
    setMetadataEx(metadataEx),
    ...fileList.map((path) => writeFile(path, files[path]!))
  ])
}
