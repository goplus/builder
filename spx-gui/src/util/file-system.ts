/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-04 16:39:59
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-04 16:45:22
 * @FilePath: /spx-gui/src/util/FileSystem.ts
 * @Description: 
 */
import localforage from 'localforage';

const storage = localforage.createInstance({
    name: 'spx-gui',
    storeName: 'project'
})

async function performAsyncOperation(operation: Promise<any>, callback?: (err: any, data: any) => void) {
    try {
        const res = await operation;
        callback?.(null, res);
        return res;
    } catch (error) {
        callback?.(error, null);
        throw error;
    }
}

export function set<T>(key: string, data: T, callback?: (err: any, data: T) => void): Promise<T> {
    return performAsyncOperation(storage.setItem(key, data), callback);
}

export function remove(key: string, callback?: (err: any, data: any) => void) {
    return performAsyncOperation(storage.removeItem(key), callback);
}

export function get(key: string, callback?: (err: any, data: any) => void) {
    return performAsyncOperation(storage.getItem(key), callback);
}

export function getWithPrefix(prefix: string, callback?: (err: any, data: any) => void): Promise<string[]> {
    const operation = storage.keys().then(keys => keys.filter(key => key.startsWith(prefix)));
    return performAsyncOperation(operation, callback);
}

export function removeWithPrefix(prefix: string, callback?: (err: any, data: any) => void) {
    const operation = storage.keys().then(keys => keys.filter(key => key.startsWith(prefix)).map(key => storage.removeItem(key)));
    return performAsyncOperation(operation, callback);
}