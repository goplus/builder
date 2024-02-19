/*
 * @Author: Yao xinyue
 * @Date: 2024-01-22 11:17:08
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-02-21 14:02:25
 * @FilePath: /builder/spx-gui/src/api/asset.ts
 * @Description:
 */
import { service } from '@/axios'
import type { Asset, PageData } from '@/interface/library.ts' // Adjust the import paths as needed
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
 * @returns PageData<Asset[]>
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
}): Promise<PageData<Asset[]>> {
  let url = `/list/asset/${pageIndex}/${pageSize}/${assetType}`
  const params = new URLSearchParams()

  if (category) {
    params.append('category', category)
  }
  if (isOrderByTime !== undefined) {
    params.append('isOrderByTime', isOrderByTime ? '1' : '0')
  }
  if (isOrderByHot !== undefined) {
    params.append('isOrderByHot', isOrderByHot ? '1' : '0')
  }
  if (Array.from(params).length > 0) {
    url += `?${params.toString()}`
  }

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

export function searchAssetByName(search: string, assetType: number): Promise<PageData<Asset[]>> {
    const url = `/asset/search`;
    const formData = new FormData();
    formData.append('search', search);
    formData.append('assetType', assetType.toString());

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

export function addAssetClickCount(
  id: number,
  assetType: number
): Promise<AxiosResponse<ResponseData<string>>> {
  const url = `/asset/clickCount/${id}/${assetType}`
  return service({
    url: url,
    method: 'get'
  })
}
