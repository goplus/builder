import type { FileCollection, ByPage, PaginationParams } from './common'
import { client, IsPublic } from './common'

export { IsPublic }

export enum AssetType {
  Sprite = 0,
  Backdrop = 1,
  Sound = 2
}

export type AssetData<T extends AssetType = AssetType> = {
  /** Globally unique ID */
  id: string
  /** Name to display */
  displayName: string
  /** Name of asset owner */
  owner: string
  /** Asset Category */
  category: string
  /** Asset Type */
  assetType: T
  /** Files the asset contains */
  files: FileCollection
  /** Hash of the files */
  filesHash: string
  /** Preview URL for the asset, e.g., a gif for a sprite */
  preview: string
  /** Click count of the asset */
  clickCount: number 
  /** Public status */
  isPublic: IsPublic
  /** Favorite status */
  isFavorite: boolean
  /** Favorite count */
  favoriteCount: number
  /** Creation time */
  cTime: string
}

export type AddAssetParams = Pick<
  AssetData,
  'displayName' | 'category' | 'assetType' | 'files' | 'filesHash' | 'preview' | 'isPublic'
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

export enum ListAssetParamOrderBy {
  Default = 'default',
  TimeDesc = 'timeDesc',
  TimeAsc = 'timeAsc',
  ClickCountDesc = 'clickCount',
  NameAsc = 'nameAsc',
  NameDesc = 'nameDesc'
}

export type ListAssetParams = PaginationParams & {
  keyword?: string
  owner?: string
  category?: string
  assetType?: AssetType
  filesHash?: string
  isPublic?: IsPublic
  orderBy?: ListAssetParamOrderBy
}

export function listAsset(params?: ListAssetParams) {
  return client.get('/assets/list', params) as Promise<ByPage<AssetData>>
}

export function listHistoryAsset(params: ListAssetParams) {
  return client.get('/assets/history/list', params) as Promise<ByPage<AssetData>>
}

export function listLikedAsset(params: ListAssetParams) {
  return client.get('/assets/liked/list', params) as Promise<ByPage<AssetData>>
}

export function getAsset(id: string) {
  return client.get(`/asset/${encodeURIComponent(id)}`) as Promise<AssetData>
}

export function increaseAssetClickCount(id: string) {
  return client.post(`/asset/${encodeURIComponent(id)}/click`) as Promise<void>
}

/**
 * WARNING: This API is not implemented in the backend yet.
 */
export function addAssetToHistory(id: string) {
  return client.post('/asset/history', { assetId: id }) as Promise<void>
}

/**
 * WARNING: This API is not implemented in the backend yet.
 */
export function addAssetToFavorites(id: string) {
  return client.post('/asset/favorites', { assetId: id }) as Promise<void>
}

/**
 * WARNING: This API is not implemented in the backend yet.
 */
export function removeAssetFromFavorites(id: string) {
  return client.delete('/asset/favorites', { assetId: id }) as Promise<void>
}