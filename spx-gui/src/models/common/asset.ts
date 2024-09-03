import { AssetType, type AssetData } from '@/apis/asset'
import { fromConfig, toConfig } from './file'
import { Sound } from '../sound'
import { Sprite } from '../sprite'
import { Backdrop, type BackdropInits } from '../backdrop'
import { getFiles, saveFiles } from './cloud'

export type PartialAssetData = Pick<AssetData, 'displayName' | 'assetType' | 'files' | 'filesHash'>

export type AssetModel<T extends AssetType = AssetType> = T extends AssetType.Sound
  ? Sound
  : T extends AssetType.Sprite
    ? Sprite
    : T extends AssetType.Backdrop
      ? Backdrop
      : never

export async function sprite2Asset(sprite: Sprite): Promise<PartialAssetData> {
  const { fileCollection, fileCollectionHash } = await saveFiles(
    sprite.export({ includeId: false, sounds: [], includeCode: false }) // animation sound is not preserved when saving as assets
  )
  return {
    displayName: sprite.name,
    assetType: AssetType.Sprite,
    files: fileCollection,
    filesHash: fileCollectionHash
  }
}

export async function asset2Sprite(assetData: PartialAssetData) {
  const files = await getFiles(assetData.files)
  const sprites = await Sprite.loadAll(files, [])
  if (sprites.length === 0) throw new Error('no sprite loaded')
  return sprites[0]
}
// Config for backdrop is not a standalone file in a project, but part of config for the project (`assets/index.json`).
// To save config for backdrop in asset data, we make a virtual file which contains the backdrop's config only.
const virtualBackdropConfigFileName = 'assets/__backdrop__.json'

export async function backdrop2Asset(backdrop: Backdrop): Promise<PartialAssetData> {
  const [config, files] = backdrop.export({ includeId: false })
  files[virtualBackdropConfigFileName] = fromConfig(virtualBackdropConfigFileName, config)
  const { fileCollection, fileCollectionHash } = await saveFiles(files)
  return {
    displayName: backdrop.name,
    assetType: AssetType.Backdrop,
    files: fileCollection,
    filesHash: fileCollectionHash
  }
}

export async function asset2Backdrop(assetData: PartialAssetData) {
  const files = await getFiles(assetData.files)
  const configFile = files[virtualBackdropConfigFileName]
  if (configFile == null) throw new Error('no config file found')
  const config = (await toConfig(configFile)) as BackdropInits
  return Backdrop.load(config, files)
}

export async function sound2Asset(sound: Sound): Promise<PartialAssetData> {
  const { fileCollection, fileCollectionHash } = await saveFiles(sound.export({ includeId: false }))
  return {
    displayName: sound.name,
    assetType: AssetType.Sound,
    files: fileCollection,
    filesHash: fileCollectionHash
  }
}

export async function asset2Sound(assetData: PartialAssetData) {
  const files = await getFiles(assetData.files)
  const sounds = await Sound.loadAll(files)
  if (sounds.length === 0) throw new Error('no sound loaded')
  return sounds[0]
}
