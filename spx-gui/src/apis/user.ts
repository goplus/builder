import type { AssetData, ListAssetParams } from "./asset";
import { client, type ByPage } from "./common";

export type AddUserAssetParams = {
  assetId: string
}

export function addUserAsset(params: AddUserAssetParams, type: 'liked' | 'history') {
  return client.post(`/user/${type}`, params) as Promise<null>
}

export function listHistoryAsset(params: ListAssetParams) {
  return client.get('/user/history/list', params) as Promise<ByPage<AssetData>>
}

export function listLikedAsset(params: ListAssetParams) {
  return client.get('/user/liked/list', params) as Promise<ByPage<AssetData>>
}
