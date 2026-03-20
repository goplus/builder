import type { Prettify } from '@/utils/types'
import { AssetType, type AssetData } from '@/apis/asset'
import { Sound } from '../sound'
import { Sprite } from '../sprite'
import { Costume } from '../costume'
import { Backdrop, type BackdropInits } from '../backdrop'
import type { SpriteGen } from '../gen/sprite-gen'
import type { BackdropGen } from '../gen/backdrop-gen'
import { fromBlob, fromConfig, toConfig } from '../../common/file'
import { getFiles, saveFiles } from '../../common/cloud'
import type { SpxProject } from '@/models/spx/project'

export type AssetMetadata = Partial<Omit<AssetData, 'files'>>

/**
 * Partial asset data includes
 * - (required) essential data: type, files, filesHash
 * - (optional) metadata: the rest fields in AssetData
 */
export type PartialAssetData = Prettify<Pick<AssetData, 'type' | 'files' | 'filesHash'> & AssetMetadata>

export type AssetModel<T extends AssetType = AssetType> = T extends AssetType.Sound
  ? Sound
  : T extends AssetType.Sprite
    ? Sprite
    : T extends AssetType.Backdrop
      ? Backdrop
      : never

export type AssetGenModel<T extends AssetType = AssetType> = T extends AssetType.Sprite
  ? SpriteGen
  : T extends AssetType.Backdrop
    ? BackdropGen
    : never

export async function sprite2Asset(sprite: Sprite): Promise<PartialAssetData> {
  const { fileCollection, fileCollectionHash } = await saveFiles(
    sprite.export({ sounds: [], includeId: false, includeCode: false, includeAssetMetadata: false }) // animation sound is not preserved when saving as assets
  )
  return {
    ...sprite.assetMetadata,
    type: AssetType.Sprite,
    files: fileCollection,
    filesHash: fileCollectionHash
  }
}

export async function asset2Sprite({ files: fileCollection, ...metadata }: AssetData) {
  const files = getFiles(fileCollection)
  const sprites = await Sprite.loadAll(files, {
    sounds: [],
    includeId: false,
    includeCode: false,
    includeAssetMetadata: false
  })
  if (sprites.length === 0) throw new Error('no sprite loaded')
  const sprite = sprites[0]
  sprite.setAssetMetadata(metadata)
  return sprite
}

// Config for backdrop is not a standalone file in a project, but part of config for the project (`assets/index.json`).
// To save config for backdrop in asset data, we make a virtual file which contains the backdrop's config only.
const virtualBackdropConfigFileName = 'assets/__backdrop__.json'

export async function backdrop2Asset(backdrop: Backdrop): Promise<PartialAssetData> {
  const [config, files] = backdrop.export({ includeId: false, includeAssetMetadata: false })
  files[virtualBackdropConfigFileName] = fromConfig(virtualBackdropConfigFileName, config)
  const { fileCollection, fileCollectionHash } = await saveFiles(files)
  return {
    ...backdrop.assetMetadata,
    type: AssetType.Backdrop,
    files: fileCollection,
    filesHash: fileCollectionHash
  }
}

export async function asset2Backdrop({ files: fileCollection, ...metadata }: AssetData) {
  const files = getFiles(fileCollection)
  const configFile = files[virtualBackdropConfigFileName]
  if (configFile == null) throw new Error('no config file found')
  const config = (await toConfig(configFile)) as BackdropInits
  const backdrop = Backdrop.load(config, files, { includeId: false, includeAssetMetadata: false })
  backdrop.setAssetMetadata(metadata)
  return backdrop
}

export async function sound2Asset(sound: Sound): Promise<PartialAssetData> {
  const { fileCollection, fileCollectionHash } = await saveFiles(
    sound.export({ includeId: false, includeAssetMetadata: false })
  )
  return {
    ...sound.assetMetadata,
    type: AssetType.Sound,
    files: fileCollection,
    filesHash: fileCollectionHash
  }
}

export async function asset2Sound({ files: fileCollection, ...metadata }: AssetData) {
  const files = getFiles(fileCollection)
  const sounds = await Sound.loadAll(files, { includeId: false, includeAssetMetadata: false })
  if (sounds.length === 0) throw new Error('no sound loaded')
  const sound = sounds[0]
  sound.setAssetMetadata(metadata)
  return sound
}

export async function genSpriteFromCanvas(name: string, width: number, height: number, color: string) {
  const canvas = await genAssetFromCanvas(name, width, height, color)
  const sprite = Sprite.create(name)
  const costume = new Costume(name, canvas)
  sprite.addCostume(costume)
  return sprite
}

export async function genBackdropFromCanvas(name: string, width: number, height: number, color: string) {
  const canvas = await genAssetFromCanvas(name, width, height, color)
  const backdrop = await Backdrop.create(name, canvas)
  return backdrop
}

export async function genAssetFromCanvas(name: string, width: number, height: number, color: string) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  // check if the name ends with .png
  const filename = name.toLowerCase().endsWith('.png') ? name : `${name}.png`
  // Set canvas dimensions
  canvas.width = width
  canvas.height = height

  // Draw a square
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)

  // Convert canvas to Blob
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob!)
    }, 'image/png')
  })

  // Create file from Blob
  const file = fromBlob(filename, blob)
  return file
}

export async function addAssetToProject(asset: AssetData, project: SpxProject) {
  switch (asset.type) {
    case AssetType.Sprite: {
      const sprite = await asset2Sprite(asset)
      await project.addSpriteWithAutoFit(sprite)
      return sprite
    }
    case AssetType.Backdrop: {
      const backdrop = await asset2Backdrop(asset)
      project.stage.addBackdrop(backdrop)
      return backdrop
    }
    case AssetType.Sound: {
      const sound = await asset2Sound(asset)
      project.addSound(sound)
      return sound
    }
    default:
      throw new Error('unknown asset type')
  }
}
