/*
 * @Author: TuGitee tgb@std.uestc.edu.cn
 * @Date: 2024-01-22 11:26:18
 * @LastEditors: TuGitee tgb@std.uestc.edu.cn
 * @LastEditTime: 2024-01-25 11:47:33
 * @FilePath: \builder\spx-gui\src\store\modules\project\index.ts
 * @Description: The store of project.
 */

import { ref, computed, watch, toRaw, WatchStopHandle, readonly } from 'vue'
import { getMimeFromExt, Content2ArrayBuffer, ArrayBuffer2Content, getPrefix } from '@/util/file'
import { defineStore, storeToRefs } from 'pinia'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import localForage from 'localforage'
import { useSoundStore } from '../sound'
import { useSpriteStore } from '../sprite'
import { useBackdropStore } from '../backdrop'
import Backdrop from '@/class/backdrop'
import Sprite from '@/class/sprite'
import Sound from '@/class/sound'
import type { projectType, dirPath, FileType, rawDir, rawFile, codeType } from '@/types/file'

const UNTITLED_NAME = 'Untitled'
const ENTRY_FILE_NAME = 'index.gmx'

const storage = localForage.createInstance({
    name: 'project',
    storeName: 'dir',
})

export const useProjectStore = defineStore('project', () => {
    const spriteStore = useSpriteStore()
    const { list: sprites } = storeToRefs(spriteStore)

    const soundStore = useSoundStore()
    const { list: sounds } = storeToRefs(soundStore)

    const backdropStore = useBackdropStore()
    const { backdrop } = storeToRefs(backdropStore)

    const title = ref<string>(UNTITLED_NAME)
    const setTitle = (t: string) => {
        title.value = t
    }

    const defaultDir = ref<dirPath>({})
    const setDefaultDir = (d: dirPath) => {
        defaultDir.value = d
    }

    const code = ref<codeType>({
        content: "\r\n",
        path: '',
    })
    const setCode = (c: string = "\r\n") => {
        code.value.content = c
    }

    /**
     * The project(computedRef) is composed of `title`, `sprites`, `sounds`, `backdrop`, `defaultDir`, `code`.
     * - `title` is the name of the project.
     * - `sprites` is the list of sprites. Refer to [Sprite](../../../class/sprite.ts).
     * - `sounds` is the list of sounds. Refer to [Sound](../../../class/sound.ts).
     * - `backdrop` is the backdrop. Refer to [Backdrop](../../../class/backdrop.ts).
     * - `defaultDir` is used to store unparsed files, such as `assets/video/` and so on.
     * - `code` is the entry code of the project which is used to generate the `main.spx` or `index.gmx`.
     * @returns {projectType}
     */
    // @ts-ignore
    const project = computed<projectType>(() => ({
        title: title.value,
        sprites: sprites.value,
        sounds: sounds.value,
        backdrop: backdrop.value,
        defaultDir: defaultDir.value,
        code: code.value
    }))

    /**
     * Convert project(computedRef) to raw object.
     * @returns {projectType} project
     */
    function getRawProject(): projectType {
        return Object.fromEntries(Object.entries(project.value).map(([k, v]) => [k, toRaw(v)])) as projectType
    }

    /**
     * Watch project and call callback when it changes.
     * @param {Function} fn 
     * @param {Boolean} deep
     * @returns {Function} stopWatch
     * 
     * @example
     * watchProjectChange(saveByProject)  // while project change, save project to IndexedDB
     */
    function watchProjectChange(fn?: Function, deep: boolean = true, immediate: boolean = false): WatchStopHandle {
        return watch(project, (newVal, oldVal) => {
            fn && fn(newVal, oldVal)
        }, { deep, immediate })
    }

    /**
     * Add Sprite or Sound to project.
     * @param item 
     * 
     * @example
     * addItem(sprite)
     */
    function addItem(...item: Sprite[] | Sound[]) {
        if (Sprite.isInstance(item)) {
            spriteStore.addItem(...item as Sprite[])
        } else if (Sound.isInstance(item)) {
            soundStore.addItem(...item as Sound[])
        }
    }

    /**
     * Set Sprite or Sound to project.
     * @param item 
     * 
     * @example
     * setItem([sprite])
     */
    function setItem(item: Sprite[] | Sound[] | Backdrop) {
        if (Sprite.isInstance(item)) {
            spriteStore.setItem(item as Sprite[])
        } else if (Sound.isInstance(item)) {
            soundStore.setItem(item as Sound[])
        } else if (Backdrop.isInstance(item)) {
            backdropStore.setItem(item as Backdrop)
        }
    }

    /**
     * Remove Sprite or Sound from project.
     * @param item 
     * 
     * @example
     * removeItem(sprite)
     */
    function removeItem(item: Sprite | Sound) {
        if (item instanceof Sprite) {
            spriteStore.removeItemByRef(item)
        } else if (item instanceof Sound) {
            soundStore.removeItemByRef(item)
        }
    }

    /**
     * Save project to local storage (IndexedDB) using project.
     * @param {projectType} proj
     * 
     * @example
     * saveByProject()  // save current project
     */
    async function saveByProject(proj: projectType = getRawProject()) {
        await removeProject(proj.title)
        const dir = convertProjectToRawDir(proj)
        await saveByRawDir(dir)
    }

    /**
     * Save project to local storage (IndexedDB) using directory path.
     * @param dirPath 
     */
    async function saveByDirPath(dirPath: dirPath) {
        for (const [key, value] of Object.entries(dirPath)) {
            await storage.setItem(key, value)
        }
    }

    /**
     * Save project to local storage (IndexedDB) using directory object.
     * @param dir 
     */
    async function saveByRawDir(dir: rawDir) {
        const dirPath = await convertRawDirToDirPath(dir)
        await saveByDirPath(dirPath)
    }

    /**
     * Remove project from local storage (IndexedDB).
     * @param {string} name
     * 
     * @example
     * removeProject("test")
     */
    async function removeProject(name: string) {
        const keys = await storage.keys()
        const projectKeys = keys.filter(key => key.startsWith(name))
        for (const key of projectKeys) {
            await storage.removeItem(key)
        }
    }

    /**
     * Generate entry code of the project. Default project is current project.
     * @param proj the project
     * @returns the entry code of the project
     */
    function genEntryCode(proj: projectType = getRawProject()) {
        let str = ""
        str += `var(\n`
        if (proj.sprites.length) {
            str += '\t'
            str += proj.sprites.map(sprite => sprite.name + " " + sprite.name).join('\n\t')
            str += '\n'
        }
        if (proj.sounds?.length) {
            str += '\t'
            str += proj.sounds.map(sound => sound.name + ' ' + 'Sound').join('\n\t')
            str += '\n'
        }
        str += ')\n\n'
        str += `run "assets", {Title: "${proj.title}"}`
        return str
    }

    /**
     * Convert project to directory object. Default project is current project.
     * @returns {rawDir} project
     */
    function convertProjectToRawDir(proj: projectType = getRawProject()): rawDir {
        const files: rawDir = Object.assign({}, proj.defaultDir, ...[proj.backdrop, ...proj.sprites, ...proj.sounds].map(item => item.dir))
        const path = proj.code.path || ENTRY_FILE_NAME
        const code = proj.code.content.trim() || genEntryCode(proj)
        files[path] = code
        const dir: rawDir = {}
        for (const [key, value] of Object.entries(files)) {
            const fullPath = proj.title + '/' + key
            dir[fullPath] = value
        }

        return dir
    }

    /**
     * Convert directory object to ArrayBuffer.
     * @returns {dirPath} project
     */
    async function convertRawDirToDirPath(dir: rawDir): Promise<dirPath> {
        const directory: dirPath = {}
        for (const [path, value] of Object.entries(dir)) {
            if ((value as FileType).content && (value as FileType).content instanceof ArrayBuffer) {
                directory[path] = Object.assign(value as FileType, { path })
                continue
            }
            const ext = path.split('.').pop()!
            const content = await Content2ArrayBuffer(value, getMimeFromExt(ext))
            directory[path] = {
                content,
                path,
                type: getMimeFromExt(ext),
                size: content.byteLength,
                modifyTime: new Date()
            }
        }

        return directory
    }

    /**
     * Reset project.
     */
    function resetProject() {
        backdropStore.setItem(new Backdrop())
        spriteStore.setItem([])
        soundStore.setItem([])
        setTitle(UNTITLED_NAME)
        setDefaultDir({})
        setCode()
    }

    /**
     * Get directory from zip file.
     * @param {File} zipFile the zip file
     * @returns {Promise<dirPath>} the directory of the zip
     * 
     * @example
     * const dir = await getDirPathFromZip(zipFile)
     * loadProject(dir)
     * 
     * // Your directory structure of zipFile should be organized this way, otherwise you may fail to read resources in `convertDirPathToProject` (which is a step in `loadProject`) and resources that fail to read will be saved in `project.defaultDir`.
     * └─ ProjectName
     *     ├─ main.spx
     *     ├─ spriteName1.spx
     *     ├─ spriteName2.spx
     *     └─ assets
     *         ├─ sprites
     *         │   ├─ spriteName1
     *         │   │   ├─ 1.png
     *         │   │   └─ index.json
     *         │   └─ spriteName2
     *         │       ├─ 2.png
     *         │       └─ index.json
     *         ├─ sounds
     *         │   ├─ soundName1
     *         │   │   ├─ 3.wav
     *         │   │   └─ index.json
     *         │   └─ soundName2
     *         │       ├─ 4.wav
     *         │       └─ index.json
     *         ├─ 5.png
     *         └─ index.json
     */
    async function getDirPathFromZip(zipFile: File): Promise<dirPath> {
        const zip = await JSZip.loadAsync(zipFile);
        const projectName = zipFile.name.split('.')[0];
        const dir: dirPath = {};
        const prefix = getPrefix(zip.files)

        for (let [relativePath, zipEntry] of Object.entries(zip.files)) {
            if (zipEntry.dir) continue
            const content = await zipEntry.async('arraybuffer')
            const path = projectName + '/' + relativePath.replace(prefix, '')
            const type = getMimeFromExt(relativePath.split('.').pop()!)
            const size = content.byteLength
            const modifyTime = zipEntry.date || new Date();
            dir[path] = {
                content,
                path,
                type,
                size,
                modifyTime
            }
        }
        return dir
    }

    /**
     * Parse directory to project.
     * @param {dirPath} dir
     * @returns {projectType} project
     */
    function convertDirPathToProject(dir: dirPath): projectType {
        function handleFile(file: FileType, filename: string, item: any) {
            switch (file.type) {
                case 'application/json':
                    item.config = ArrayBuffer2Content(file.content, file.type) as Record<string, any>;
                    break;
                default:
                    item.files.push(ArrayBuffer2Content(file.content, file.type, filename) as File);
                    break;
            }
        }

        function findOrCreateItem(name: string, collection: any[], constructor: typeof Sprite | typeof Sound) {
            let item = collection.find(item => item.name === name);
            if (!item) {
                item = new constructor(name);
                collection.push(item);
            }
            return item;
        }

        const proj: projectType = {
            title: UNTITLED_NAME,
            sprites: [],
            sounds: [],
            backdrop: new Backdrop(),
            defaultDir: {},
            code: {
                path: '',
                content: ''
            }
        };

        proj.title = Object.keys(dir).pop()?.split('/').shift() || UNTITLED_NAME

        for (let [path, file] of Object.entries(dir)) {
            const filename = file.path.split('/').pop()!;
            path = path.replace(proj.title + '/', '')
            if (Sprite.REG_EXP.test(path)) {
                const spriteName = path.match(Sprite.REG_EXP)?.[1] || '';
                const sprite: Sprite = findOrCreateItem(spriteName, proj.sprites, Sprite);
                handleFile(file, filename, sprite);
            }
            else if (/^(main|index)\.(spx|gmx)$/.test(path)) {
                proj.code.path = path
                proj.code.content = ArrayBuffer2Content(file.content, file.type) as string
            }
            else if (/^.+\.spx$/.test(path)) {
                const spriteName = path.match(/^(.+)\.spx$/)?.[1] || '';
                const sprite: Sprite = findOrCreateItem(spriteName, proj.sprites, Sprite);
                sprite.code = ArrayBuffer2Content(file.content, file.type) as string;
            }
            else if (Sound.REG_EXP.test(path)) {
                const soundName = path.match(Sound.REG_EXP)?.[1] || '';
                const sound: Sound = findOrCreateItem(soundName, proj.sounds, Sound);
                handleFile(file, filename, sound);
            }
            else if (Backdrop.REG_EXP.test(path)) {
                handleFile(file, filename, proj.backdrop);
            }
            else {
                proj.defaultDir[path] = ArrayBuffer2Content(file.content, file.type, filename)
            }
        }
        return proj
    }

    /**
     * Convert file type to raw.
     * @param file the file
     * @returns 
     */
    function convertFileTypeToRaw(file: FileType): any {
        return ArrayBuffer2Content(file.content, file.type, file.path.split('/').pop()!)
    }

    /**
     * Convert directory path `<string, FileType>` to raw `<string, rawFile>`.
     * @param dir the directory
     * @returns 
     */
    function convertDirPathToRawDir(dir: dirPath): rawDir {
        return Object.fromEntries(Object.entries(dir).map(([path, file]) => [path, convertFileTypeToRaw(file)]))
    }

    /**
     * 
     * @param key 
     * @param value 
     * @returns 
     */
    const zipFileValue = (key: string, value: rawFile): [string, string | File] => {
        if (typeof value === 'string' || value instanceof File) {
            return [key, value]
        } else {
            return [key, JSON.stringify(value)]
        }
    }

    /**
     * Convert directory object to zip.
     * @param dir the directory object with raw files to be converted
     * @returns the zip
     */
    async function convertRawDirToZip(dir: rawDir): Promise<Blob> {
        const zip = new JSZip();
        const prefix = getPrefix(dir)
        for (let [path, value] of Object.entries(dir)) {
            prefix && (path = path.replace(prefix + '/', ''));
            zip.file(...zipFileValue(path, value));
        }
        const content = await zip.generateAsync({ type: 'blob' })
        return content
    }

    /**
     * Load project from local storage using directory path.
     * @param {dirPath} dir
     * 
     * @example
     * const dir = await getDirPathFromLocal('test')
     * dir && loadProject(dir)
     */
    function loadProject(dir: dirPath) {
        const proj = convertDirPathToProject(dir);
        backdropStore.setItem(proj.backdrop);
        spriteStore.setItem(proj.sprites);
        soundStore.setItem(proj.sounds);
        setTitle(proj.title);
        setDefaultDir(proj.defaultDir);
        code.value.path = proj.code.path;
        setCode(proj.code.content);
    }

    /**
     * Get project from local storage (IndexedDB).
     * @param {string} name the name of project
     * @returns {dirPath} the directory of project
     * 
     * @example
     * const dir = await getDirPathFromLocal('test')
     * dir && loadProject(dir)
     * dir && saveToComputerByDirPath(dir)
     */
    async function getDirPathFromLocal(name: string): Promise<dirPath | null> {
        const keys = await storage.keys()
        const projectKeys = keys.filter(key => key.startsWith(name))
        if (projectKeys.length === 0) {
            return null
        }
        const project: dirPath = {}
        for (const key of projectKeys) {
            const value: FileType = await storage.getItem(key) as FileType || null
            project[key] = value
        }
        return project
    }

    /**
     * Get all local project from IndexedDB (localForage).
     * @returns {Promise<string[]>}
     * 
     * @example
     * const projects = await getAllLocalProjects()  // get all local projects' name
     * const dir = await getDirPathFromLocal(projects[0])  // get dirpath of the first local project
     * dir && loadProject(dir)  // if dir exists, load project
     */
    async function getAllLocalProjects(): Promise<string[]> {
        const keys = await storage.keys()
        const map = new Map()
        for (const key of keys) {
            const k = key.split('/').shift()
            if (!k) continue
            if (!map.has(k)) {
                map.set(k, true)
            }
        }
        return Array.from(map.keys())
    }

    /**
     * Generate zip file from project. Default project is current project.
     */
    async function convertProjectToZip(proj: projectType = getRawProject()): Promise<Blob> {
        const dir = convertProjectToRawDir(proj)
        const content = await convertRawDirToZip(dir)
        return content
    }

    /**
     * Save project to computer. Default project is current project.
     * 
     * @example
     * saveToComputerByProject()
     */
    async function saveToComputerByProject(proj: projectType = getRawProject()) {
        const content = await convertProjectToZip(proj);
        saveAs(content, `${proj.title}.zip`);
    }

    /**
     * Save dirPath to computer.
     * 
     * @example
     * const dir = await getDirPathFromLocal('test')
     * dir && saveToComputerByDirPath(dir)
     */
    async function saveToComputerByDirPath(dir: dirPath) {
        const rawDir = convertDirPathToRawDir(dir)
        const content = await convertRawDirToZip(rawDir)
        const title = getPrefix(dir) || UNTITLED_NAME
        saveAs(content, `${title}.zip`);
    }

    return {
        setTitle,
        setCode,
        code,
        watchProjectChange,
        resetProject,
        saveByProject,
        saveByDirPath,
        saveByRawDir,
        removeProject,
        loadProject,
        genEntryCode,
        getDirPathFromZip,
        getDirPathFromLocal,
        convertProjectToRawDir,
        convertDirPathToRawDir,
        convertRawDirToDirPath,
        convertDirPathToProject,
        convertProjectToZip,
        convertRawDirToZip,
        saveToComputerByDirPath,
        saveToComputerByProject,
        title: readonly(title),
        getAllLocalProjects,
        project,
        addItem,
        removeItem,
        setItem
    }

})
