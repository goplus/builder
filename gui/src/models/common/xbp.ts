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
import { DefaultException } from '@/utils/exception'
import { isSupportedProjectType, ProjectType } from '@/apis/project'
import { File as LazyFile, toConfig, type Files as LazyFiles } from './file'
import type { PartialMetadata, ProjectSerialized } from '../project'
import { createAIDescriptionFiles, extractAIDescription } from './'

const metadataFileName = 'builder-meta.json'
const thumbnailFileName = 'builder-thumbnail'

/** Helpers for loading project from or saving project to xbp files. */
export class XbpHelpers {
  load(file: globalThis.File): Promise<ProjectSerialized> {
    return load(file)
  }
  save({ metadata, files }: ProjectSerialized, signal?: AbortSignal) {
    return save(metadata, files, signal)
  }
}

export const xbpHelpers = new XbpHelpers()

export async function load(xbpFile: File) {
  const metadata: PartialMetadata = {}
  const arrayBuffer = await xbpFile.arrayBuffer()
  const unzipped = await unzip(new Uint8Array(arrayBuffer))
  const files: LazyFiles = {}
  await Promise.all(
    Object.keys(unzipped).map(async (path) => {
      const uint8Array = unzipped[path]
      const file = new LazyFile(filename(path), () => Promise.resolve(uint8Array.buffer))
      if (path === metadataFileName) {
        const m = (await toConfig(file)) as PartialMetadata
        if (m.type == null) m.type = ProjectType.Game // Default to Game type for backward compatibility
        if (!isSupportedProjectType(m.type)) {
          throw new DefaultException({
            en: `The project type "${m.type}" is not supported.`,
            zh: `该项目类型暂不支持：${m.type}。`
          })
        }
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

export async function save(metadata: PartialMetadata, files: LazyFiles, signal?: AbortSignal) {
  const zippable: Zippable = {}

  const metadataJson = JSON.stringify({
    type: metadata.type,
    displayName: metadata.displayName,
    description: metadata.description,
    instructions: metadata.instructions,
    extraSettings: metadata.extraSettings
  } satisfies PartialMetadata)
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
