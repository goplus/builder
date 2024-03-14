/*
 * @Author: TuGitee tgb@std.uestc.edu.cn
 * @Date: 2024-01-19 21:53:50
 * @LastEditors: TuGitee tgb@std.uestc.edu.cn
 * @LastEditTime: 2024-01-24 17:32:45
 * @FilePath: \builder\spx-gui\src\util\class.ts
 * @Description: The util of class.
 */

import { AssetBase } from "@/class/asset-base";
import localforage from "localforage";

/**
 * Check if an object is an instance of a class.
 * @param obj The object to check.
 * @param ctor The constructor of the class.
 * @returns True if the object is an instance of the class, false otherwise.
 */
export function isInstance<T>(obj: any, ctor: { new(...args: any[]): T }): obj is T {
    if (Array.isArray(obj)) {
        return obj.every(item => isInstance(item, ctor));
    }
    return obj instanceof ctor;
}

/**
 * Get the storage for the asset.
 * @param storeName the name of the storage.
 * @returns the storage
 */
export function getStorage(storeName: string) {
    return localforage.createInstance({
        name: "asset",
        storeName
    })
}

/**
 * Get all items in the storage.
 * @param storeName the name of the storage.
 * @returns all items in the storage.
 */
export async function getAllFromLocal<T extends typeof AssetBase>(assetType: T): Promise<InstanceType<T>[]> {
    const store = getStorage(assetType.NAME);
    const keys = await store.keys();
    const assets: InstanceType<T>[] = [];
    for (const key of keys) {
        const rawData = await store.getItem(key);
        const asset = assetType.fromRawData(rawData);
        assets.push(asset as InstanceType<T>);
    }
    return assets;
}