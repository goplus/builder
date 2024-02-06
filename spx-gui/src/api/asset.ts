/*
 * @Author: Yao xinyue
 * @Date: 2024-01-22 11:17:08
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-02-06 13:43:02
 * @FilePath: /builder/spx-gui/src/api/asset.ts
 * @Description: 
 */
import { service } from "@/axios";
import type { Asset, PageData } from "@/interface/library.ts"; // Adjust the import paths as needed

/**
 * Fetches a list of assets.
 *
 * @param pageIndex The index of the page to retrieve in a paginated list.
 * @param pageSize The number of assets to retrieve per page.
 * @param assetType The type of the asset. See src/constant/constant.ts for details.
 * @param category (Optional) The category of the assets to filter by.
 * @returns PageData<Asset[]>
 */
export function getAssetList(pageIndex: number, pageSize: number, assetType: number, category?: string): Promise<PageData<Asset[]>> {
    let url = `/list/asset/${pageIndex}/${pageSize}/${assetType}`;
    if (category) {
        url += `?category=${category}`;
    }
    return service({
        url: url,
        method: "get",
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
    const url = `/list/asset/${id}/${assetType}`;
    return service({
        url: url,
        method: "get",
    });
}

