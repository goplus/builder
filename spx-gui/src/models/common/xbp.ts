/**
 * @file Xbp file related helper
 * @desc load-from & export-to xbp file
 * Xbp file is a zip file with a specific structure that contains
 * metadata and files for a Builder project.
 * https://github.com/goplus/builder/issues/464
 */

import JSZip from 'jszip'
import { filename, stripExt } from '@/utils/path'
import { getExtFromMime } from '@/utils/file'
import { File as LazyFile, toConfig, type Files as LazyFiles } from './file'
import type { Metadata } from '../project'
import { createAIDescriptionFiles, extractAIDescription } from './'

const metadataFileName = 'builder-meta.json'
const thumbnailFileName = 'builder-thumbnail'

export async function load(xbpFile: File) {
  const metadata: Metadata = {}
  const jszip = await JSZip.loadAsync(xbpFile)
  const files: LazyFiles = {}
  await Promise.all(
    Object.keys(jszip.files).map(async (path) => {
      const zipEntry = jszip.files[path]
      const file = new LazyFile(filename(path), () => zipEntry.async('arraybuffer'))
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
  const zip = new JSZip()
  zip.file(
    metadataFileName,
    JSON.stringify({
      description: metadata.description,
      instructions: metadata.instructions
    })
  )
  if (metadata.thumbnail != null) {
    const ext = getExtFromMime(metadata.thumbnail.type) ?? 'jpg'
    zip.file(`${thumbnailFileName}.${ext}`, metadata.thumbnail.arrayBuffer(signal))
  }

  const aiDescriptionFiles = createAIDescriptionFiles(metadata)
  Object.entries(aiDescriptionFiles).forEach(([path, file]) => {
    if (file != null) zip.file(path, file.arrayBuffer(signal))
  })

  Object.entries(files).forEach(([path, file]) => {
    if (file != null) zip.file(path, file.arrayBuffer(signal))
  })
  const blob = await zip.generateAsync({ type: 'blob' })
  signal?.throwIfAborted()
  return new File([blob], (metadata.name || 'Untitled') + '.xbp')
}
