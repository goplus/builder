import { AssetType, type AssetData } from '@/api/asset'
import { fromConfig, toConfig } from './file'
import { Sound } from '../sound'
import { Sprite } from '../sprite'
import { Backdrop, type BackdropConfig } from '../backdrop'
import { getFiles, uploadFiles } from './cloud'

export type Size = {
  width: number
  height: number
}

export function assign<T extends object>(instance: T, patches: Partial<T>) {
  Object.assign(instance, patches)
}


export type PartialAssetData = Pick<AssetData, 'displayName' | 'assetType' | 'files'>

export async function sprite2Asset(sprite: Sprite): Promise<PartialAssetData> {
  const fileUrls = await uploadFiles(sprite.export())
  return {
    displayName: sprite.name,
    assetType: AssetType.Sprite,
    files: fileUrls
  }
}

export async function asset2Sprite(assetData: PartialAssetData) {
  const files = getFiles(assetData.files)
  const sprites = await Sprite.loadAll(files)
  if (sprites.length === 0) throw new Error('no sprite loaded')
  return sprites[0]
}

// Config for backdrop is not a standalone file in a project, but part of config for the project (`assets/index.json`).
// To save config for backdrop in asset data, we make a virtual file which contains the backdrop's config only.
const virtualBackdropConfigFileName = 'assets/__backdrop__.json'

export async function backdrop2Asset(backdrop: Backdrop): Promise<PartialAssetData> {
  const [config, files] = backdrop.export()
  files[virtualBackdropConfigFileName] = fromConfig(virtualBackdropConfigFileName, config)
  const fileUrls = await uploadFiles(files)
  return {
    displayName: backdrop.name,
    assetType: AssetType.Backdrop,
    files: fileUrls
  }
}

export async function asset2Backdrop(assetData: PartialAssetData) {
  const files = getFiles(assetData.files)
  const configFile = files[virtualBackdropConfigFileName]
  if (configFile == null) throw new Error('no config file found')
  const config = await toConfig(configFile) as BackdropConfig
  return Backdrop.load(config, files)
}

export async function sound2Asset(sound: Sound): Promise<PartialAssetData> {
  const fileUrls = await uploadFiles(sound.export())
  return {
    displayName: sound.name,
    assetType: AssetType.Sound,
    files: fileUrls
  }
}

export async function asset2Sound(assetData: PartialAssetData) {
  const files = getFiles(assetData.files)
  const sounds = await Sound.loadAll(files)
  if (sounds.length === 0) throw new Error('no sound loaded')
  return sounds[0]
}
