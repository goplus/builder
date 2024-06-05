import JSZip from 'jszip'
import { getMimeFromExt } from './file'

export interface ExportedScratchFile {
  name: string
  extension: string
  filename: string
  blob: Blob
  bitmapResolution?: number
}

export interface ExportedScratchSprite {
  name: string
  costumes: ExportedScratchFile[]
}

export interface ExportedScratchAssets {
  sprites: ExportedScratchSprite[]
  sounds: ExportedScratchFile[]
  backdrops: ExportedScratchFile[]
}

interface ScratchFile {
  name: string
  assetId: string
  dataFormat: string
  md5ext?: string
}

type ScratchCostume = ScratchFile & {
  rotationCenterX: number
  rotationCenterY: number
  bitmapResolution: number
}

type ScratchSound = ScratchFile & {
  rate: number
  sampleCount: number
}

interface ScratchProject {
  targets: {
    name: string
    isStage: boolean
    costumes: ScratchCostume[]
    sounds: ScratchSound[]
  }[]
}

const getFilename = (file: ScratchFile) =>
  file.md5ext ? file.md5ext : `${file.assetId}.${file.dataFormat}`

export const parseScratchFileAssets = async (file: File): Promise<ExportedScratchAssets> => {
  const zip = await JSZip.loadAsync(file)
  const projectJson = await zip.file('project.json')?.async('string')
  if (!projectJson) throw new Error('Project JSON not found in the uploaded file.')

  const projectData: ScratchProject = JSON.parse(projectJson)

  const scratchAssets: ExportedScratchAssets = {
    sprites: [],
    sounds: [],
    backdrops: []
  }

  const convertFiles = async (
    scratchFiles: (ScratchCostume | ScratchSound)[]
  ): Promise<ExportedScratchFile[]> => {
    const files = []
    for (const file of scratchFiles) {
      const zipFilename = getFilename(file)
      const zipFile = zip.file(zipFilename)
      if (!zipFile) {
        console.warn('Costume file not found in the uploaded file: ', zipFilename)
        continue
      }
      const arrayBuffer = await zipFile.async('arraybuffer')
      files.push({
        name: file.name,
        extension: file.dataFormat,
        filename: `${file.name}.${file.dataFormat}`,
        blob: new Blob([arrayBuffer], { type: getMimeFromExt(file.dataFormat) }),
        bitmapResolution: 'bitmapResolution' in file ? file.bitmapResolution : undefined
      })
    }
    return files
  }

  for (const target of projectData.targets) {
    const imageFiles = await convertFiles(target.costumes)
    const soundFiles = await convertFiles(target.sounds)

    if (imageFiles.length > 0) {
      if (target.isStage) {
        scratchAssets.backdrops.push(...imageFiles)
      } else {
        scratchAssets.sprites.push({ name: target.name, costumes: imageFiles })
      }
    }

    if (soundFiles.length > 0) {
      scratchAssets.sounds.push(...soundFiles)
    }
  }

  return scratchAssets
}
