import { unzip } from '@/utils/zip'
import { getMimeFromExt } from './file'

export interface ExportedScratchFile {
  name: string
  extension: string
  filename: string
  blob: Blob
}

export interface ExportedScratchCostume extends ExportedScratchFile {
  rotationCenterX: number
  rotationCenterY: number
  bitmapResolution: number
}

export interface ExportedScratchSound extends ExportedScratchFile {
  rate: number
  sampleCount: number
}

export interface ExportedScratchSprite {
  name: string
  costumes: ExportedScratchCostume[]
}

export interface ExportedScratchAssets {
  sprites: ExportedScratchSprite[]
  sounds: ExportedScratchSound[]
  backdrops: ExportedScratchCostume[]
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

const getFilename = (file: ScratchFile) => (file.md5ext ? file.md5ext : `${file.assetId}.${file.dataFormat}`)

export const parseScratchFileAssets = async (file: File): Promise<ExportedScratchAssets> => {
  const arrayBuffer = await file.arrayBuffer()
  const unzipped = await unzip(new Uint8Array(arrayBuffer))

  const projectJsonData = unzipped['project.json']
  if (projectJsonData == null) throw new Error('Project JSON not found in the uploaded file.')
  const projectJson = new TextDecoder().decode(projectJsonData)

  const projectData: ScratchProject = JSON.parse(projectJson)

  const scratchAssets: ExportedScratchAssets = {
    sprites: [],
    sounds: [],
    backdrops: []
  }

  const convertScratchFile = async (file: ScratchFile): Promise<ExportedScratchFile | null> => {
    const zipFilename = getFilename(file)
    const zipFile = unzipped[zipFilename]
    if (zipFile == null) {
      console.warn('File not found in zip: ', zipFilename)
      return null
    }
    return {
      name: file.name,
      extension: file.dataFormat,
      filename: `${file.name}.${file.dataFormat}`,
      blob: new Blob([zipFile], { type: getMimeFromExt(file.dataFormat) })
    }
  }

  const convertSound = async (sound: ScratchSound): Promise<ExportedScratchSound | null> => {
    const file = await convertScratchFile(sound)
    if (file == null) return null
    return {
      ...file,
      rate: sound.rate,
      sampleCount: sound.sampleCount
    }
  }

  const convertCostume = async (costume: ScratchCostume): Promise<ExportedScratchCostume | null> => {
    const file = await convertScratchFile(costume)
    if (file == null) return null
    return {
      ...file,
      rotationCenterX: costume.rotationCenterX,
      rotationCenterY: costume.rotationCenterY,
      bitmapResolution: costume.bitmapResolution
    }
  }

  for (const target of projectData.targets) {
    const costumes = filterNulls(await Promise.all(target.costumes.map(convertCostume)))
    const sounds = filterNulls(await Promise.all(target.sounds.map(convertSound)))

    if (costumes.length > 0) {
      if (target.isStage) {
        scratchAssets.backdrops.push(...costumes)
      } else {
        scratchAssets.sprites.push({ name: target.name, costumes: costumes })
      }
    }

    if (sounds.length > 0) {
      scratchAssets.sounds.push(...sounds)
    }
  }

  return scratchAssets
}

function filterNulls<T>(array: (T | null)[]): T[] {
  return array.filter((item): item is T => item != null)
}
