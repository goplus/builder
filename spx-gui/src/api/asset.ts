/*
 * @Author: Yao xinyue
 * @Date: 2024-01-22 11:17:08
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-02-29 18:12:33
 * @FilePath: /builder/spx-gui/src/api/asset.ts
 * @Description:
 */
import { service } from '@/axios'
import type { Asset, PageAssetResponse, SearchAssetResponse } from '@/interface/library.ts' // Adjust the import paths as needed
import type { ResponseData } from '@/axios'
import type { AxiosResponse } from 'axios'
/**
 * Fetches a list of assets.
 *
 * @param pageIndex The index of the page to retrieve in a paginated list.
 * @param pageSize The number of assets to retrieve per page.
 * @param assetType The type of the asset. See src/constant/constant.ts for details.
 * @param category (Optional) The category of the assets to filter by.
 * @param isOrderByTime (Optional) The time of the assets to filter by.
 * @param isOrderByHot (Optional) The hot of the assets to filter by.
 * @returns PageAssetResponse
 */
export function getAssetList({
  pageIndex,
  pageSize,
  assetType,
  category,
  isOrderByTime,
  isOrderByHot
}: {
  pageIndex: number
  pageSize: number
  assetType: number
  category?: string
  isOrderByTime?: boolean
  isOrderByHot?: boolean
}): Promise<PageAssetResponse> {
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

  const url = `/list/asset?${params.toString()}`

  return service({
    url: url,
    method: 'get'
  })
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
 * @description: Post multi costumes to generate sprite gif.
 * @param {string} files
 * @param {number} assetType
 * @return { SearchAssetResponse }
 */
export function generateGifByCostumes(name: string, files: File[], category?:string|undefined, flag?:number): Promise<string> {
  const url = `/spirits/upload`
  const formData = new FormData()
  formData.append('name', name)
  files.forEach((file) => {
    formData.append('files', file)
  })
  if(category){
    formData.append('category', category.toString())
  }
  if(flag){
    formData.append('flag', flag.toString())
  }

  return service({
    url: url,
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}
