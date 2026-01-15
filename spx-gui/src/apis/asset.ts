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

export type AddAssetParams = Prettify<
  Pick<
    AssetData,
    'displayName' | 'type' | 'category' | 'description' | 'extraSettings' | 'files' | 'filesHash' | 'visibility'
  >
>

export function addAsset(params: AddAssetParams) {
  return client.post('/asset', params) as Promise<AssetData>
}

export type UpdateAssetParams = AddAssetParams

export function updateAsset(id: string, params: UpdateAssetParams) {
  return client.put(`/asset/${encodeURIComponent(id)}`, params) as Promise<AssetData>
}

export function deleteAsset(id: string) {
  return client.delete(`/asset/${encodeURIComponent(id)}`) as Promise<void>
}

export type ListAssetParams = PaginationParams & {
  keyword?: string
  owner?: string
  type?: AssetType
  /** @deprecated Not recommended for use as the field `category` is deprecated. */
  category?: string
  filesHash?: string
  visibility?: Visibility
  orderBy?: 'createdAt' | 'updatedAt' | 'displayName'
  sortOrder?: 'asc' | 'desc'
}

export function listAsset(params?: ListAssetParams) {
  return client.get('/assets/list', params) as Promise<ByPage<AssetData>>
}

export function getAsset(id: string) {
  return client.get(`/asset/${encodeURIComponent(id)}`) as Promise<AssetData>
}

export function increaseAssetClickCount(id: string) {
  return client.post(`/asset/${encodeURIComponent(id)}/click`) as Promise<void>
}
