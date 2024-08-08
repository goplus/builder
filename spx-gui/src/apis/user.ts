import type { AssetData, ListAssetParams } from "./asset";
import { client, type ByPage } from "./common";

export type AddUserAssetParams = {
  assetId: string
}

export function addAssetToHistory(id: string) {
  return client.post('/asset/history', { assetId: id }) as Promise<void>
}

export function addAssetToFavorites(id: string) {
  return client.post('/asset/favorites', { assetId: id }) as Promise<void>
}

export function listHistoryAsset(params: ListAssetParams) {
  return client.get('/user/history/list', params) as Promise<ByPage<AssetData>>
}

export function listLikedAsset(params: ListAssetParams) {
  return client.get('/user/liked/list', params) as Promise<ByPage<AssetData>>
}

/**
 * WARNING: This API is not implemented in the backend yet.
 */
export function removeAssetFromFavorites(id: string) {
  return client.delete('/asset/favorites', { assetId: id }) as Promise<void>
}