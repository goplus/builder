import { FileType } from '@/types/file';
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

const fs = {
    writeFile(filename: string, data: FileType, callback?: (err: any, data: any) => void): Promise<FileType> {
        return performAsyncOperation(storage.setItem(filename, data), callback);
    },

    unlink(filename: string, callback?: (err: any, data: any) => void) {
        return performAsyncOperation(storage.removeItem(filename), callback);
    },

    readFile(filename: string, callback?: (err: any, data: any) => void): Promise<FileType> {
        return performAsyncOperation(storage.getItem(filename) as Promise<FileType>, callback);
    },

    readdir(dirname: string, callback?: (err: any, data: any) => void): Promise<string[]> {
        const operation = storage.keys().then(keys => keys.filter(key => key.startsWith(dirname)));
        return performAsyncOperation(operation, callback);
    },

    rmdir(dirname: string, callback?: (err: any, data: any) => void) {
        return performAsyncOperation(storage.removeItem(dirname), callback);
    },
}

export default fs;