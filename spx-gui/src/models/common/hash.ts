import type { FileCollection } from '@/apis/common'
import type { File, Files } from './file'

export async function hashFiles(files: Files) {
  const fileCollection: FileCollection = {}
  await Promise.all(
    Object.entries(files).map(async ([path, file]) => {
      if (file != null) fileCollection[path] = await hashFile(file)
    })
  )
  return hashFileCollection(fileCollection)
}

export async function hashFileCollection(fileCollection: FileCollection): Promise<string> {
  // Sort fileCollection alphabetically by path to ensure consistent hash
  const sortedFileCollection = Object.fromEntries(
    Object.entries(fileCollection).sort(([pathA], [pathB]) =>
      pathA < pathB ? -1 : pathA > pathB ? 1 : 0
    )
  )
  const data = new TextEncoder().encode(JSON.stringify(sortedFileCollection))
  return calculateHash(data)
}

async function hashFile(file: File): Promise<string> {
  if (file.meta.hash != null) return file.meta.hash
  const ab = await file.arrayBuffer()
  if (ab.byteLength >= 100 * 1024)
    console.warn(
      'performance issues may exist when calculating hash for large file:',
      file.name,
      ab.byteLength
    )
  const hash = await calculateHash(ab)
  file.meta.hash = hash
  return hash
}

async function calculateHash(data: BufferSource) {
  const hash = await crypto.subtle.digest('SHA-1', data)
  const hashB64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(hash))))
  return 'h1:' + hashB64
}
