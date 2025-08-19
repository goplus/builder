import { fromText, toText, type Files } from './file'
import type { Metadata } from '../project'

export type Size = {
  width: number
  height: number
}

export function assign<T extends object>(instance: T, patches: Partial<T>) {
  Object.assign(instance, patches)
}

const aiDescriptionFileName = 'builder-ai-description.md'
const aiDescriptionHashFileName = 'builder-ai-description.hash'

/** Create AI description files from metadata */
export function createAIDescriptionFiles(metadata: Metadata): Files {
  const files: Files = {}
  if (metadata.aiDescription != null) {
    files[aiDescriptionFileName] = fromText(aiDescriptionFileName, metadata.aiDescription)
  }
  if (metadata.aiDescriptionHash != null) {
    files[aiDescriptionHashFileName] = fromText(aiDescriptionHashFileName, metadata.aiDescriptionHash)
  }
  return files
}

/** Extract AI description from files and remove them from files */
export async function extractAIDescription(files: Files): Promise<{
  aiDescription: string | null
  aiDescriptionHash: string | null
}> {
  let aiDescription: string | null = null
  const aiDescriptionFile = files[aiDescriptionFileName]
  if (aiDescriptionFile != null) {
    aiDescription = await toText(aiDescriptionFile)
    delete files[aiDescriptionFileName]
  }

  let aiDescriptionHash: string | null = null
  const aiDescriptionHashFile = files[aiDescriptionHashFileName]
  if (aiDescriptionHashFile != null) {
    aiDescriptionHash = await toText(aiDescriptionHashFile)
    delete files[aiDescriptionHashFileName]
  }

  return { aiDescription, aiDescriptionHash }
}
