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
  /** Creation time */
  cTime: string
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
  isLiked: boolean
  /** Favorite count */
  likeCount: number
  rate?: number
}

export type AddAssetParams = Pick<
  AssetData,
  'displayName' | 'category' | 'assetType' | 'files' | 'filesHash' | 'preview' | 'isPublic'
> & {
  prompt?: string
}

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

export enum ListAssetParamOrderBy {//todo: auto import in LibrarySelect
  TimeDesc = 'timeDesc',
  TimeAsc = 'timeAsc',
  NameAsc = 'nameAsc',
  NameDesc = 'nameDesc'
  //clickCountDesc,default
}

export type ListAssetParams = PaginationParams & {
  keyword?: string
  owner?: string
  category?: string[]
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

/**
 * @param keyword 
 * @param count 
 * @returns 
 */
export async function getAssetSearchSuggestion(keyword: string, count = 6) {
  if (!keyword) {
    return { suggestions: [] }
  }
  return client.get('/assets/list/suggestions', { query:keyword, limit:count }) as Promise<{
    suggestions: string[]
  }>
}

export interface AssetRate {
  rate: number
  detail: { score: number, count: number }[]
}

/**
 * Get the rate of an asset
 * 
 * @param id 
 * @returns 
 */
export function getAssetRate(id: string): Promise<AssetRate> {
  return client.get(`/user/rate/${encodeURIComponent(id)}`) as Promise<AssetRate>
}

/**
 * Rate an asset
 * 
 * @param id asset id
 * @param rate rate value, 1-5
 * @returns
 */
export function rateAsset(id: string, rate: number) {
  if ([1, 2, 3, 4, 5].indexOf(rate) === -1) {
    throw new Error('Invalid rate value')
  }
  return client.post(`/user/rate/${encodeURIComponent(id)}`, { rate }) as Promise<void>
}
