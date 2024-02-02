/*
 * @Author: Yao xinyue
 * @Date: 2024-01-22 11:17:08
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-25 23:26:44
 * @FilePath: /builder/spx-gui/src/api/asset.ts
 * @Description: 
 */
import { service } from "@/axios";
import { Asset, PageData } from "@/interface/library.ts"; // Adjust the import paths as needed


/**
 * Fetches a list of assets.
 *
 * @param pageIndex The index of the page to retrieve in a paginated list.
 * @param pageSize The number of assets to retrieve per page.
 * @param assetType The type of the asset. See src/constant/constant.ts for details.
 * @returns PageData<Asset[]>
 */
export function getAssetList(pageIndex: number, pageSize: number, assetType: number): Promise<PageData<Asset[]>> {
    const url = `/list/asset/${pageIndex}/${pageSize}/${assetType}`;
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

