import type { FileCollection, ByPage, PaginationParams } from './common'
import { client, Visibility } from './common'
import type { ProjectSettings } from './project'

export { Visibility }

export enum AssetType {
  Sprite = 'sprite',
  Backdrop = 'backdrop',
  Sound = 'sound'
}

export type AssetSettings = ProjectSettings

export type AssetData = {
  /** Unique identifier */
  id: string
  /** Username of the asset's owner */
  owner: string
  /** Display name of the asset */
  displayName: string
  /** Type of the asset */
  type: AssetType
  /** Category to which the asset belongs */
  category: string
  /** File paths and their corresponding universal URLs associated with the asset */
  files: FileCollection
  /** Hash of the asset files */
  filesHash: string
  /** Visibility of the asset */
  visibility: Visibility
}

export type AddAssetParams = Pick<AssetData, 'displayName' | 'type' | 'category' | 'files' | 'filesHash' | 'visibility'>

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
