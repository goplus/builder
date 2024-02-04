import type { FileType } from '@/types/file';
import localforage from 'localforage';

const storage = localforage.createInstance({
    name: 'file-system',
    storeName: 'file'
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

export function writeFile(filename: string, data: FileType, callback?: (err: any, data: any) => void): Promise<FileType> {
    return performAsyncOperation(storage.setItem(filename, data), callback);
}

export function unlink(filename: string, callback?: (err: any, data: any) => void) {
    return performAsyncOperation(storage.removeItem(filename), callback);
}

export function readFile(filename: string, callback?: (err: any, data: any) => void): Promise<FileType> {
    return performAsyncOperation(storage.getItem(filename) as Promise<FileType>, callback);
}

export function readdir(dirname: string, callback?: (err: any, data: any) => void): Promise<string[]> {
    const operation = storage.keys().then(keys => keys.filter(key => key.startsWith(dirname)));
    return performAsyncOperation(operation, callback);
}

export function rmdir(dirname: string, callback?: (err: any, data: any) => void) {
    const operation = storage.keys().then(keys => keys.filter(key => key.startsWith(dirname)).map(key => storage.removeItem(key)));
    return performAsyncOperation(operation, callback);
}