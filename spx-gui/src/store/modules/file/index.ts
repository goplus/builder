import { defineStore } from "pinia";
import { ref } from "vue";
import type { FileType, dirPath } from '@/types/file';
import localForage from 'localforage';

const storage = localForage.createInstance({
    name: 'file',
    storeName: 'dir'
})

export const useFileStore = defineStore("file", () => {
    const files = ref<dirPath>({});

    function createFile(path: string, content: FileType) {
        files.value[path] = content;
    }

    function readFile(path: string) {
        return files.value[path]
    }

    function updateFile(path: string, content: FileType) {
        files.value[path] = content;
    }

    function deleteFile(path: string) {
        delete files.value[path];
    }

    async function save() {
        for (const [key, value] of Object.entries(files.value)) {
            await storage.setItem(key, value)
        }
    }

    function reset() {
        files.value = {};
    }

    async function load(root: string) {
        reset()
        const paths = await storage.keys();
        for (const path of paths) {
            if (path.startsWith(root)) {
                const content: FileType = await storage.getItem(path) as FileType
                files.value[path] = content
            }
        }
    }

    return {
        files,
        createFile,
        readFile,
        updateFile,
        deleteFile,
        save,
        load,
        reset
    };
})