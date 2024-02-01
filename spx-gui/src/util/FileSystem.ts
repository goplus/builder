import { FileType } from '@/types/file';
import localforage from 'localforage';

const storage = localforage.createInstance({
    name: 'file-system',
    storeName: 'file'
})

const fs = {
    async writeFile(filename: string, data: FileType, callback?: (err: any, data: any) => void) {
        try {
            const res = await storage.setItem(filename, data);
            return callback ? callback(null, res) : res;
        } catch (error) {
            return callback ? callback(error, null) : error;
        }
    },

    async unlink(filename: string, callback?: (err: any, data: any) => void) {
        try {
            const res = await storage.removeItem(filename);
            return callback ? callback(null, res) : res;
        } catch (error) {
            return callback ? callback(error, null) : error;
        }
    },

    async readFile(filename: string, callback?: (err: any, data: any) => void) {
        try {
            const res = await storage.getItem(filename) as FileType;
            return callback ? callback(null, res) : res;
        } catch (error) {
            return callback ? callback(error, null) : error;
        }
    },

    async readdir(dirname: string, callback?: (err: any, data: any) => void) {
        try {
            const res = await storage.keys();
            const files = res.filter(key => key.startsWith(dirname))
            return callback ? callback(null, files) : files;
        } catch (error) {
            return callback ? callback(error, null) : error;
        }
    },

    async rmdir(dirname: string, callback?: (err: any, data: any) => void) {
        try {
            const res = await storage.removeItem(dirname);
            return callback ? callback(null, res) : res;
        } catch (error) {
            return callback ? callback(error, null) : error;
        }
    },
}

export default fs;