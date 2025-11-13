/**
 * @file Xbp file related helper
 * @desc load-from & export-to xbp file
 * Xbp file is a zip file with a specific structure that contains
 * metadata and files for a Builder project.
 * https://github.com/goplus/builder/issues/464
 */

import { zip, unzip, type Zippable } from '@/utils/zip'
import { filename, stripExt } from '@/utils/path'
import { getExtFromMime } from '@/utils/file'
import { File as LazyFile, toConfig, type Files as LazyFiles } from './file'
import type { Metadata } from '../project'
import { createAIDescriptionFiles, extractAIDescription } from './'

const metadataFileName = 'builder-meta.json'
const thumbnailFileName = 'builder-thumbnail'

export async function load(xbpFile: File) {
  const metadata: Metadata = {}
  const arrayBuffer = await xbpFile.arrayBuffer()
  const unzipped = await unzip(new Uint8Array(arrayBuffer))
  const files: LazyFiles = {}
  await Promise.all(
    Object.keys(unzipped).map(async (path) => {
      const uint8Array = unzipped[path]
      const file = new LazyFile(filename(path), () => Promise.resolve(uint8Array.buffer))
      if (path === metadataFileName) {
        const m = await toConfig(file)
        Object.assign(metadata, m)
        return
      }
      if (stripExt(path) === thumbnailFileName) {
        metadata.thumbnail = file
        return
      }
      files[path] = file
    })
  )

  const { aiDescription, aiDescriptionHash } = await extractAIDescription(files)
  metadata.aiDescription = aiDescription
  metadata.aiDescriptionHash = aiDescriptionHash

  return { metadata, files }
}

export async function save(metadata: Metadata, files: LazyFiles, signal?: AbortSignal) {
  const zippable: Zippable = {}

  const metadataJson = JSON.stringify({
    description: metadata.description,
    instructions: metadata.instructions
  })
  zippable[metadataFileName] = new TextEncoder().encode(metadataJson)

  if (metadata.thumbnail != null) {
    const ext = getExtFromMime(metadata.thumbnail.type) ?? 'jpg'
    const arrayBuffer = await metadata.thumbnail.arrayBuffer(signal)
    zippable[`${thumbnailFileName}.${ext}`] = new Uint8Array(arrayBuffer)
  }

  const aiDescriptionFiles = createAIDescriptionFiles(metadata)
  await Promise.all(
    [...Object.entries(aiDescriptionFiles), ...Object.entries(files)].map(async ([path, file]) => {
      if (file != null) zippable[path] = new Uint8Array(await file.arrayBuffer(signal))
    })
  )

  const zipped = await zip(zippable, { level: 6, signal })
  return new File([zipped], (metadata.name || 'Untitled') + '.xbp')
}
