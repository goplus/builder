import type { AssetData, ListAssetParams } from "./asset";
import { client, type ByPage } from "./common";

export type AddUserAssetParams = {
  assetId: string
}

export function addAssetToHistory(id: string) {
  return client.post('/user/history', { assetId: id }) as Promise<void>
}

export function addAssetToFavorites(id: string) {
  return client.post('/user/liked', { assetId: id }) as Promise<void>
}

export function listHistoryAsset(params: ListAssetParams) {
  return client.get('/user/history/list', params) as Promise<ByPage<AssetData>>
}

export function listLikedAsset(params: ListAssetParams) {
  return client.get('/user/liked/list', params) as Promise<ByPage<AssetData>>
}

export function removeAssetFromFavorites(id: string) {
  return client.delete('/user/liked', { assetId: id }) as Promise<void>
}