import { client } from "./common";

export type AddUserAssetParams = {
  assetId: string
}

export function addUserAsset(params: AddUserAssetParams, type: 'liked' | 'history') {
  return client.post(`/user/${type}`, params) as Promise<null>
}

