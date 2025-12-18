import { AssetType, type AssetData } from '@/apis/asset'
import { fromConfig, toConfig } from './file'
import { Sound } from '../sound'
import { Sprite } from '../sprite'
import { Backdrop, type BackdropInits } from '../backdrop'
import { getFiles, saveFiles } from './cloud'
import { fromBlob } from '@/models/common/file'
import { Costume } from '@/models/costume'

export type PartialAssetData = Pick<AssetData, 'type' | 'files' | 'filesHash'>

export type AssetMetadata = Partial<Omit<AssetData, 'files'>>

export type AssetModel<T extends AssetType = AssetType> = T extends AssetType.Sound
  ? Sound
  : T extends AssetType.Sprite
    ? Sprite
    : T extends AssetType.Backdrop
      ? Backdrop
      : never

export async function sprite2Asset(sprite: Sprite): Promise<PartialAssetData> {
  const { fileCollection, fileCollectionHash } = await saveFiles(
    sprite.export({ sounds: [], includeId: false, includeCode: false, includeAssetMetadata: false }) // animation sound is not preserved when saving as assets
  )
  return {
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
