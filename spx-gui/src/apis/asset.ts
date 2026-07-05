import type { Prettify } from '@/utils/types'
import type {
  FileCollection,
  ByPage,
  PaginationParams,
  Perspective,
  ArtStyle,
  SpriteCategory,
  BackdropCategory,
  SoundCategory
} from './common'
import { client, Visibility } from './common'

export { Visibility }

export const assetDisplayNameMaxLength = 100

export enum AssetType {
  Sprite = 'sprite',
  Backdrop = 'backdrop',
  Sound = 'sound'
}

export type AssetExtraSettings = {
  /** Category to which the asset belongs */
  category?: SpriteCategory | BackdropCategory | SoundCategory
  /**
   * Art style indicates the visual style or aesthetic approach used in the creation of graphics.
   * NOTE: Not available for Sound assets.
   */
  artStyle?: ArtStyle
  /**
   * Perspective indicates the viewpoint from which the "game world" is viewed.
   * NOTE: Not available for Sound assets.
   */
  perspective?: Perspective
}

export type AssetData = {
  /** Unique identifier */
  id: string
  /** Username of the asset's owner */
  owner: string
  /** Display name of the asset */
  displayName: string
  /** Type of the asset */
  type: AssetType
  /**
   * Category to which the asset belongs
   * @deprecated Use `category` in `extraSettings` instead.
   */
  category: string
  /** Brief description of the asset */
  description: string
  /** Extra settings specific to the asset */
  extraSettings: AssetExtraSettings
  /** File paths and their corresponding universal URLs associated with the asset */
  files: FileCollection
  /** Hash of the asset files */
  filesHash: string
  /** Visibility of the asset */
  visibility: Visibility
}

export type ListAssetsParams = PaginationParams & {
  /** Filter assets by display name pattern */
  keyword?: string
  /** Filter assets by type */
  type?: AssetType
  /**
   * Filter assets by category
   * @deprecated Not recommended for use as the field `category` is deprecated.
   */
  category?: string
  /** Filter assets by files hash */
  filesHash?: string
  /** Filter assets by visibility */
  visibility?: Visibility
  /** Field by which to order the results */
  orderBy?: 'createdAt' | 'updatedAt' | 'displayName'
  /** Order in which to sort the results */
  sortOrder?: 'asc' | 'desc'
}

export function listAssets(params?: ListAssetsParams, signal?: AbortSignal) {
  return client.get('/assets', params, { signal }) as Promise<ByPage<AssetData>>
}

export function listSignedInUserAssets(params?: ListAssetsParams, signal?: AbortSignal) {
  return client.get('/user/assets', params, { signal }) as Promise<ByPage<AssetData>>
}

export type AddAssetParams = Prettify<
  Pick<
    AssetData,
    'displayName' | 'type' | 'category' | 'description' | 'extraSettings' | 'files' | 'filesHash' | 'visibility'
  >
>

export function addAsset(params: AddAssetParams) {
  return client.post('/user/assets', params) as Promise<AssetData>
}

export function getAsset(id: string) {
  return client.get(`/assets/${encodeURIComponent(id)}`) as Promise<AssetData>
}

export type UpdateAssetParams = AddAssetParams

export function updateAsset(id: string, params: UpdateAssetParams) {
  return client.patch(`/assets/${encodeURIComponent(id)}`, params) as Promise<AssetData>
}

export function deleteAsset(id: string) {
  return client.delete(`/assets/${encodeURIComponent(id)}`) as Promise<void>
}
