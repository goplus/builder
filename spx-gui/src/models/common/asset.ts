import { AssetType, type AssetData } from '@/apis/asset'
import {
  isContentReady,
  isPreviewReady,
  type TaggedAIAssetData
} from '@/apis/aigc'
import { fromConfig, toConfig } from './file'
import { Sound } from '../sound'
import { Sprite } from '../sprite'
import { Backdrop, backdropAssetPath, type BackdropInits, type RawBackdropConfig } from '../backdrop'
import { getFiles, saveFiles } from './cloud'

export type PartialAssetData<T extends AssetType = AssetType> = Pick<AssetData<T>, 'displayName' | 'assetType' | 'files' | 'filesHash'>

export type AssetModel<T extends AssetType = AssetType> = T extends AssetType.Sound
  ? Sound
  : T extends AssetType.Sprite
    ? Sprite
    : T extends AssetType.Backdrop
      ? Backdrop
      : never

export async function sprite2Asset(sprite: Sprite): Promise<PartialAssetData> {
  const { fileCollection, fileCollectionHash } = await saveFiles(sprite.export(false))
  return {
    displayName: sprite.name,
    assetType: AssetType.Sprite,
    files: fileCollection,
    filesHash: fileCollectionHash
  }
}

export async function asset2Sprite(assetData: PartialAssetData) {
  const files = await getFiles(assetData.files)
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
  const { fileCollection, fileCollectionHash } = await saveFiles(sound.export())
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

/**
 * A wrapper function to convert asset data to asset model.
 * @param assetData 
 */
export async function convertAssetData<T extends AssetType>(assetData: PartialAssetData<T>): Promise<AssetModel<T>>;
export async function convertAssetData(assetData: PartialAssetData): Promise<AssetModel> {
  switch (assetData.assetType) {
    case AssetType.Sprite:
      return asset2Sprite(assetData)
    case AssetType.Backdrop:
      return asset2Backdrop(assetData)
    case AssetType.Sound:
      return asset2Sound(assetData)
    default:
      throw new Error(`unknown asset type ${assetData.assetType}`)
  }
}

const AssetModelSymbol = Symbol('AssetModelCache')

/**
 * A wrapper function to convert asset data to asset model with cache.
 * 
 * The cache is stored in the asset data itself with a symbol key.
 * @param assetData 
 */
export async function cachedConvertAssetData<T extends AssetType>(assetData: PartialAssetData<T> & { [AssetModelSymbol]?: AssetModel }): Promise<AssetModel<T>>;
export async function cachedConvertAssetData(assetData: PartialAssetData & { [AssetModelSymbol]?: AssetModel }): Promise<AssetModel> {
  if (assetData[AssetModelSymbol] != null) return assetData[AssetModelSymbol]
  const model = await convertAssetData(assetData)
  assetData[AssetModelSymbol] = model
  return model
}

/**
 * Convert a ai-generated backdrop asset (which only contains a preview image) to a full backdrop asset in place.
 * 
 * The full backdrop asset contains a image and a config file
 * 
 * @param asset A `TaggedAIAssetData` which preview is ready
 */
export async function convertAIAssetToBackdrop(asset: TaggedAIAssetData) {
  if (!asset[isPreviewReady] || asset.preview === undefined) {
    throw new Error(`asset ${asset.id}'s content is not ready`)
  }
  const backdropFilepath = `${backdropAssetPath}/${asset.id}.jpg`
  const config: RawBackdropConfig = {
    bitmapResolution: 1,
    faceRight: 0,
    name: asset.displayName ?? asset.id,
    path: `${asset.id}.jpg`,
    x: 0,
    y: 0
  }
  const configFile = fromConfig(virtualBackdropConfigFileName, config, {
    type: 'application/json'
  })
  const backdropFile = await getFiles({
    [backdropFilepath]: asset.preview
  })
  // configFile is `application/json` and it will be saved as an inlined file
  // backdropFile is read from the cloud (it should has a `universalUrl`) and it won't trigger a new save
  const {fileCollection, fileCollectionHash} = await saveFiles({
    ...backdropFile,
    [virtualBackdropConfigFileName]: configFile
  })
  asset.files = fileCollection
  asset.filesHash = fileCollectionHash
  asset.displayName = config.name
  asset[isContentReady] = true
}