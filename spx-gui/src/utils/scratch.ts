import JSZip from 'jszip'
import { getMimeFromExt } from './file'

/**
 * Represents the detailed information of an asset extracted from a Scratch project file.
 */
export interface ExportedScratchAsset {
  type: ExportedScratchAssetType
  name: string
  extension: string
  blob: Blob
  src: string
}

export type ExportedScratchAssetType = 'sprite' | 'sound' | 'backdrop' | 'unknown'

interface ScratchFile {
  name: string
  assetId: string
  dataFormat: string
  format: string
  rate: number
  sampleCount: number
  md5ext: string
}

/**
 * Describes the structure of a Scratch project
 */
interface ScratchProject {
  targets: {
    isStage: boolean
    costumes: ScratchFile[]
    sounds: ScratchFile[]
  }[]
}

export const parseScratchFileAssets = async (file: File): Promise<ExportedScratchAsset[]> => {
  const zip = await JSZip.loadAsync(file)
  const projectJson = await zip.file('project.json')?.async('string')
  if (!projectJson) throw new Error('Project JSON not found in the uploaded file.')

  const projectData: ScratchProject = JSON.parse(projectJson)
  const assetNameMap = new Map<
    string, // filename
    {
      name: string
      dataFormat: string
      isStage: boolean
    }
  >()

  projectData.targets.forEach((target) => {
    const f = (asset: ScratchFile) => {
      // A special case for the stage: md5ext is empty
      const filename = asset.md5ext ? asset.md5ext : `${asset.assetId}.${asset.dataFormat}`
      assetNameMap.set(filename, {
        isStage: target.isStage,
        name: asset.name,
        dataFormat: asset.dataFormat
      })
    }
    target.costumes.forEach(f)
    target.sounds.forEach(f)
  })

  const assetFileDetails: ExportedScratchAsset[] = []

  for (const [filename, zipFile] of Object.entries(zip.files)) {
    const metadata = assetNameMap.get(filename)
    if (!metadata) continue

    const arrayBuffer = await zipFile.async('arraybuffer')
    const blob = new Blob([arrayBuffer], { type: getMimeFromExt(metadata.dataFormat) })

    assetFileDetails.push({
      type: typeByExtension(metadata.dataFormat, metadata.isStage),
      name: metadata.name,
      extension: metadata.dataFormat,
      blob,
      src: URL.createObjectURL(blob)
    })
  }

  return assetFileDetails
}

const isAudio = (extension: string) => getMimeFromExt(extension).startsWith('audio')
const isImage = (extension: string) => getMimeFromExt(extension).startsWith('image')

const typeByExtension = (extension: string, isStage: boolean): ExportedScratchAssetType => {
  if (isAudio(extension)) return 'sound'
  if (isImage(extension)) {
    if (isStage) return 'backdrop'
    return 'sprite'
  }
  return 'unknown'
}
