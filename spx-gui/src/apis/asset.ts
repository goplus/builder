import type { FileCollection, ByPage, PaginationParams } from './common'
import { client, IsPublic } from './common'

export { IsPublic }

export enum AssetType {
  Sprite = 0,
  Backdrop = 1,
  Sound = 2
}

export type AssetData = {
  /** Globally unique ID */
  id: string
  /** Name to display */
  displayName: string
  /** Name of asset owner */
  owner: string
  /** Asset Category */
  category: string
  /** Asset Type */
  assetType: AssetType
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
  TimeDesc = 'time',
  ClickCountDesc = 'clickCount'
}

export type ListAssetParams = PaginationParams & {
  keyword?: string
  owner?: string
  category?: string|string[]
  assetType?: AssetType
  filesHash?: string
  isPublic?: IsPublic
  orderBy?: ListAssetParamOrderBy
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
