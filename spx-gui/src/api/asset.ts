/*
 * @Author: Yao xinyue
 * @Date: 2024-01-22 11:17:08
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-06 14:50:20
 * @FilePath: \spx-gui\src\api\asset.ts
 * @Description:
 */
import { service } from '@/axios'
import type { Asset, PageAssetResponse, SearchAssetResponse } from '@/interface/library.ts' // Adjust the import paths as needed
import type { ResponseData } from '@/axios'
import type { AxiosResponse } from 'axios'

export enum PublishState {
  NotPublished = 0,
  PrivateLibrary = 1,
  PublicAndPrivateLibrary = 2
}

/**
 * Fetches a list of assets
 *
 * @param assetLibraryType 'public' / 'private';
 * @param pageIndex The index of the page to retrieve in a paginated list.
 * @param pageSize The number of assets to retrieve per page.
 * @param assetType The type of the asset. See src/constant/constant.ts for details.
 * @param category (Optional) The category of the assets to filter by.
 * @param isOrderByTime (Optional) Whether to order assets by time.
 * @param isOrderByHot (Optional) Whether to order assets by popularity.
 * @returns PageAssetResponse
 */
export function getAssetList({
  assetLibraryType,
  pageIndex,
  pageSize,
  assetType,
  category,
  isOrderByTime,
  isOrderByHot
}: {
  assetLibraryType: string,
  pageIndex: number,
  pageSize: number,
  assetType: number,
  category?: string,
  isOrderByTime?: boolean,
  isOrderByHot?: boolean
}): Promise<PageAssetResponse> {
  let baseAssetUrl = "/list/asset"
  if (assetLibraryType === 'private') {
    baseAssetUrl = "/list/userasset"
  }

  const params = new URLSearchParams()

  params.append('pageIndex', pageIndex.toString())
  params.append('pageSize', pageSize.toString())
  params.append('assetType', assetType.toString())

  if (category) {
    params.append('category', category)
  }
  if (isOrderByTime) {
    params.append('isOrderByTime', '1')
  }
  if (isOrderByHot) {
    params.append('isOrderByHot', '1')
  }

  const url = `${baseAssetUrl}?${params.toString()}`

  return service({
    url: url,
    method: 'get'
  });
}

/**
 * Fetches a single asset
 *
 * @param id
 * @param assetType The type of the asset. See src/constant/constant.ts for details.
 * @returns Asset
 */
export function getAsset(id: number, assetType: number): Promise<Asset> {
  const url = `/list/asset/${id}/${assetType}`
  return service({
    url: url,
    method: 'get'
  })
}

/**
 * @description: Search Asset by name.
 * @param {string} search
 * @param {number} assetType
 * @return { SearchAssetResponse }
 */
export function searchAssetByName(search: string, assetType: number): Promise<SearchAssetResponse> {
  const url = `/asset/search`
  const formData = new FormData()
  formData.append('search', search)
  formData.append('assetType', assetType.toString())

  return service({
    url: url,
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * Save asset
 *
 * @param id
 * @param name
 * @param uid
 * @param category
 * @param isPublic
 * @param assetType The type of the asset. See src/constant/constant.ts for details.
 * @param file
 */
export async function saveAsset(
  id: number,
  name: string,
  uid: number,
  category: string,
  isPublic: number,
  assetType: number,
  file: File
): Promise<Asset> {
  const url = '/asset/save'
  const formData = new FormData()
  formData.append('id', id.toString())
  formData.append('name', name)
  formData.append('uid', uid.toString())
  formData.append('category', category)
  formData.append('isPublic', isPublic ? '1' : '0')
  formData.append('assetType', assetType.toString())
  formData.append('file', file)

  return service({
    url: url,
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * @description: Add asset click count.
 * @param id
 * @param assetType The type of the asset. See src/constant/constant.ts for details.
 * @return {Promise<AxiosResponse<ResponseData<string>>>}
 */
export function addAssetClickCount(
  id: number,
  assetType: number
): Promise<AxiosResponse<ResponseData<string>>> {
  const url = `/clickCount/asset/${id}/${assetType}`
  return service({
    url: url,
    method: 'get'
  })
}

/**
 * @description: Publish asset to library.
 * @param { string } name - sprite name named by user.
 * @param { File[] } files - sprite costumes files, saved to show in lib.
 * @param { PublishState } publishState - The publishing state of the asset.
 * @param { string|undefined } [gif] - Optional. The address of the sprite's GIF.
 *                                   Only provide this parameter if there is more than one file.
 *                                   It is used to display in the library when the sprite is hovering.
 * @param { string|undefined } category - the category of the sprite(used to classify in library).
 * @return { Promise<string> } - The result of the publishing operation.
 */
export function publishAsset(
  name: string,
  files: File[],
  publishState: PublishState,
  gif?: string,
  category?: string,
): Promise<string> {
  const url = `/sprite/upload`
  const formData = new FormData()
  formData.append('name', name);
  files.forEach((file) => {
    formData.append('files', file)
  });
  if (gif) {
    formData.append('gif', gif)
  }
  if (category) {
    formData.append('category', category)
  }
  formData.append('publishState', publishState.toString())

  // Assume `service` is a predefined function for handling HTTP requests.
  return service({
    url: url,
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * @description: generate gif by costumes files
 * @param {File} files - sprite costumes files
 * @return {string} get sprites gif address.
 */
export function generateGifByCostumes(files: File[]): Promise<AxiosResponse<ResponseData<string>>> {
  const url = `/sprite/togif`
  const formData = new FormData()
  files.forEach((file) => {
    formData.append('files', file)
  })

  return service({
    url: url,
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}
