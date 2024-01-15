import { ref, computed, watch, toRaw, ComputedRef, WatchStopHandle, readonly } from 'vue'
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

const UNTITLED_NAME = 'Untitled'

type projectType = {
    title: string,
    sprites: Sprite[],
    sounds: Sound[],
    backdrop: Backdrop
}

type FileType = {
    content: ArrayBuffer,
    path: string,
    type: string,
    size: number,
    modifyTime: Date
}

type dirPath = Record<string, FileType>

/**
 * Map file type to mime type.
 */
const ext2mime: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'avif': 'image/avif',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'json': 'application/json',
    'spx': 'text/plain',
}

/**
 * Get mime type from file extension.
 * @param ext the file extension
 * @returns the mime type
 */
const getMimeFromExt = (ext: string) => ext2mime[ext] || 'text/plain'

/**
 * Convert array buffer to content.
 * @param arr the array buffer
 * @param type the mime type
 * @param name the file name
 * @returns the content
 */
const ArrayBuffer2Content = (arr: ArrayBuffer, type: string, name?: string) => {
    name = name || UNTITLED_NAME
    switch (type) {
        case 'application/json':
            return JSON.parse(new TextDecoder().decode(arr))
        case 'text/plain':
            return new TextDecoder().decode(arr)
        default:
            return new File([arr], name, { type })
    }
}

/**
 * Convert content to array buffer.
 * @param content the content
 * @param type the mime type
 * @returns the array buffer
 */
const Content2ArrayBuffer = async (content: any, type: string): Promise<ArrayBuffer> => {
    switch (type) {
        case 'application/json':
            return new TextEncoder().encode(JSON.stringify(content)).buffer
        case 'text/plain':
            return new TextEncoder().encode(content).buffer
        default:
            const reader = new FileReader()
            reader.readAsArrayBuffer(content)
            await new Promise(resolve => reader.onload = resolve)
            return reader.result as ArrayBuffer
    }
}


export const useProjectStore = defineStore('project', () => {
    const spriteStore = useSpriteStore()
    const { sprites } = storeToRefs(spriteStore)
    const { setSprite } = spriteStore

    const soundStore = useSoundStore()
    const { sounds } = storeToRefs(soundStore)
    const { setSound } = soundStore

    const backdropStore = useBackdropStore()
    const { backdrop } = storeToRefs(backdropStore)
    const { setBackdrop } = backdropStore

    const title = ref(UNTITLED_NAME)
    const setTitle = (t: string) => {
        removeProject(title.value)
        title.value = t
        saveProject()
    }

    // @ts-ignore
    const project: ComputedRef<projectType> = computed(() => ({
        title: title.value,
        sprites: sprites.value,
        sounds: sounds.value,
        backdrop: backdrop.value
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
     */
    function watchProjectChange(fn?: Function, deep: boolean = true, immediate: boolean = false): WatchStopHandle {
        return watch(project, (newVal, oldVal) => {
            fn && fn(newVal, oldVal)
        }, { deep, immediate })
    }

    /**
     * Save current project to local storage.
     */
    async function saveProject() {
        const dir = convertProjectToDirectory()
        const dirBuffer = await convertDirectoryToBuffer(dir)
        await removeProject(project.value.title)
        for (const [key, value] of Object.entries(dirBuffer)) {
            await localForage.setItem(key, value)
        }
    }

    /**
     * Remove project from local storage.
     * @param {string} name
     */
    async function removeProject(name: string) {
        const keys = await localForage.keys()
        const projectKeys = keys.filter(key => key.startsWith(name))
        projectKeys.forEach(key => localForage.removeItem(key))
    }

    /**
     * Convert project(computedRef) to directory object.
     * @returns {Record<string, any>} project
     */
    function convertProjectToDirectory(): Record<string, any> {
        const project = getRawProject();
        const files: Record<string, any> = Object.assign({}, ...[project.backdrop, ...project.sprites, ...project.sounds].map(item => item.dir))

        files['main.spx'] = `var (\n\t${project.sprites.map(sprite => sprite.name + " " + sprite.name).join('\n\t')}\n\t${project.sounds?.map(sound => sound.name + ' Sound').join('\n\t')}\n)\n\nrun "assets", {Title: "${project.title}"}`
        return files
    }

    /**
     * Convert directory object to ArrayBuffer.
     * @returns {dirPath} project
     */
    async function convertDirectoryToBuffer(dir: Record<string, any>): Promise<dirPath> {
        const directory: dirPath = {}

        for (const [path, value] of Object.entries(dir)) {
            const ext = path.split('.').pop()!
            const content = await Content2ArrayBuffer(value, getMimeFromExt(ext))
            directory[project.value.title + '/' + path] = {
                content,
                path: path,
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
        setBackdrop(new Backdrop())
        setSprite([])
        setSound([])
        setTitle(UNTITLED_NAME)
    }

    /**
     * Get directory from zip file.
     * @param {File} zipFile the zip file
     * @returns {Promise<dirPath>} the directory of the zip
     * 
     * @example
     * const dir = await getDirPathFromZip(zipFile)
     * loadProject(dir)
     */
    async function getDirPathFromZip(zipFile: File): Promise<dirPath> {
        const zip = await JSZip.loadAsync(zipFile);
        const projectName = zipFile.name.split('.')[0];
        const dir: dirPath = {};

        for (let [relativePath, zipEntry] of Object.entries(zip.files)) {
            const content = await zipEntry.async('arraybuffer')
            const path = projectName + '/' + relativePath
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
    function parseProject(dir: dirPath): projectType {
        const project: projectType = {
            title: UNTITLED_NAME,
            sprites: [],
            sounds: [],
            backdrop: new Backdrop([])
        };

        project.title = Object.keys(dir).pop()?.split('/').shift() || UNTITLED_NAME

        for (const [path, file] of Object.entries(dir)) {
            if (/\/assets\/sprites\/.+\//.test(path)) {
                const spriteName = path.match(/\/assets\/sprites\/(.+)\//)?.[1] || '';
                const sprite = project.sprites.find(sprite => sprite.name === spriteName);
                if (sprite) {
                    switch (file.type) {
                        case 'application/json':
                            sprite.config = ArrayBuffer2Content(file.content, file.type) as Record<string, any>;
                            break;
                        default:
                            sprite.files.push(ArrayBuffer2Content(file.content, file.type, file.path.split('/').pop()) as File);
                            break;
                    }
                } else {
                    switch (file.type) {
                        case 'application/json':
                            project.sprites.push(new Sprite(spriteName, [], '', ArrayBuffer2Content(file.content, file.type) as Record<string, any>));
                            break;
                        default:
                            project.sprites.push(new Sprite(spriteName, [ArrayBuffer2Content(file.content, file.type, file.path.split('/').pop()) as File]));
                            break;
                    }
                }
            }
            else if (!path.includes('main.spx') && /\/.+\.spx$/.test(path)) {
                const spriteName = path.match(/\/(.+)\.spx$/)?.[1] || '';
                const sprite = project.sprites.find(sprite => sprite.name === spriteName);
                if (sprite) {
                    sprite.code = ArrayBuffer2Content(file.content, file.type) as string;
                } else {
                    project.sprites.push(new Sprite(spriteName, [], ArrayBuffer2Content(file.content, file.type) as string));
                }
            }
            else if (/\/assets\/sounds\/.+\//.test(path)) {
                const soundName = path.match(/\/assets\/sounds\/(.+)\//)?.[1] || '';
                const sound = project.sounds.find(sound => sound.name === soundName);

                if (sound) {
                    switch (file.type) {
                        case 'application/json':
                            sound.config = ArrayBuffer2Content(file.content, file.type) as Record<string, any>;
                            break;
                        default:
                            sound.files.push(ArrayBuffer2Content(file.content, file.type, file.path.split('/').pop()) as File);
                            break;
                    }
                } else {
                    switch (file.type) {
                        case 'application/json':
                            project.sounds.push(new Sound(soundName, [], ArrayBuffer2Content(file.content, file.type) as Record<string, any>));
                            break;
                        default:
                            project.sounds.push(new Sound(soundName, [ArrayBuffer2Content(file.content, file.type, file.path.split('/').pop()) as File], {}));
                            break;
                    }
                }
            }
            else if (/\/assets\/[^\/]+$/.test(path)) {
                switch (file.type) {
                    case 'application/json':
                        project.backdrop.config = ArrayBuffer2Content(file.content, file.type) as Record<string, any>;
                        break;
                    default:
                        project.backdrop.files.push(ArrayBuffer2Content(file.content, file.type, file.path.split('/').pop()) as File);
                        break;
                }
            }
        }

        return project
    }

    /**
     * Load project from local storage using directory path.
     * @param {dirPath} dir
     */
    function loadProject(dir: dirPath) {
        const project = parseProject(dir);
        setBackdrop(project.backdrop);
        setSprite(project.sprites);
        setSound(project.sounds);
        setTitle(project.title);
    }

    /**
     * Get project from local storage.
     * @param {string} name the name of project
     * @returns {dirPath} the directory of project
     * 
     * @example
     * const dir = await getProjectFromLocal('test')
     * loadProject(dir)
     */
    async function getDirPathFromLocal(name: string): Promise<dirPath | null> {
        const keys = await localForage.keys()
        const projectKeys = keys.filter(key => key.startsWith(name))
        if (projectKeys.length === 0) {
            return null
        }
        const project: dirPath = {}
        for (const key of projectKeys) {
            const value: FileType = await localForage.getItem(key) as FileType || null
            project[key] = value
        }
        return project
    }

    /**
     * Save project to computer.
     */
    async function saveProjectToComputer() {
        const zip = new JSZip();
        const dir = convertProjectToDirectory()

        const zipFileValue = (key: string, value: string | File | Record<string, any>): [string, string | File] => {
            if (typeof value === 'string' || value instanceof File) {
                return [key, value]
            } else {
                return [key, JSON.stringify(value)]
            }
        }

        console.log(dir);

        for (const [key, value] of Object.entries(dir)) {
            zip.file(...zipFileValue(key, value));
        }

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `${project.value.title}.zip`);
    }

    return {
        setTitle,
        watchProjectChange,
        resetProject,
        saveProject,
        removeProject,
        loadProject,
        getDirPathFromZip,
        getDirPathFromLocal,
        saveProjectToComputer,
        title: readonly(title),
        project
    }

})
