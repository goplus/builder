import { ref, computed, watch, toRaw } from 'vue'
import { defineStore, storeToRefs } from 'pinia'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import localForage from 'localforage'
import { useSoundStore } from './sound'
import { useSpriteStore } from './sprite'
import { useBackdropStore } from './backdrop'
import Backdrop from '@/class/backdrop'
import Sprite from '@/class/sprite'
import Sound from '@/class/sound'

const UNTITLED_NAME = 'Untitled'

/**
 * @typedef {Object} project
 * @property {string} title
 * @property {Sprite[]} sprites
 * @property {Sound[]} sounds
 * @property {Object} backdrop
 * @property {File[]} backdrop.files
 * @property {any} backdrop.config
 */

/**
 * Map image type to mime type.
 */
const image2mime = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'avif': 'image/avif'
}

/**
 * Map audio type to mime type.
 */
const audio2mime = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg'
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
    const setTitle = t => title.value = t

    /**
     * @type {ComputedRef<project>}
     */
    const project = computed(() => ({
        title: title.value,
        sprites: sprites.value,
        sounds: sounds.value,
        backdrop: backdrop.value
    }))

    /**
     * Convert project(computedRef) to raw object.
     * @returns {project} project
     */
    function getRawProject() {
        return Object.fromEntries(Object.entries(project.value).map(([k, v]) => [k, toRaw(v)]))
    }

    /**
     * Watch project and call callback when it changes.
     * @param {Function} fn 
     * @param {Boolean} deep
     * @returns {Function} stopWatch
     */
    function watchProjectChange(fn, deep = true) {
        return watch(project, (newVal, oldVal) => {
            fn && fn(newVal, oldVal)
        }, { deep })
    }

    /**
     * Save project to local storage.
     */
    async function saveProject() {
        await localForage.setItem('project', getRawProject());
        // TODO: save file seperately
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
     * Load project from zip file.
     * @param {Blob} zipData
     */
    async function loadProjectFromZip(zipData) {
        const zip = await JSZip.loadAsync(zipData);

        const project = {
            title: '',
            sprites: [],
            sounds: [],
            backdrop: new Backdrop([])
        };

        for (let [relativePath, zipEntry] of Object.entries(zip.files)) {
            if (relativePath === 'main.spx') {
                const mainSpx = await zipEntry.async('string');
                const titleMatch = mainSpx.match(/run "assets", {Title: "(.*?)"}/);
                titleMatch && (project.title = titleMatch[1])
            }
            else if (relativePath === `${Backdrop.ROOT_PATH}index.json`) {
                const indexJson = await zip.file(`${Backdrop.ROOT_PATH}index.json`).async('string');
                project.backdrop.config = JSON.parse(indexJson);
            }
            else if (/^assets\/sprites\/.+\/$/.test(relativePath)) {
                const spriteName = relativePath.split('/')[2];
                const spriteConfig = JSON.parse(await zip.file(`${relativePath}index.json`).async('string'));
                const spriteCode = await zip.file(`${spriteName}.spx`).async('string');

                const spriteFiles = []
                zip.folder(relativePath).forEach(async (_, file) => {
                    const ext = file.name.split('.').pop()
                    if (Object.keys(image2mime).includes(ext)) {
                        const mimeType = image2mime[ext]
                        const blob = await file.async('blob')
                        const _file = new File([blob], file.name.split('/').pop(), { type: mimeType });
                        spriteFiles.push(_file);
                    }
                });
                project.sprites.push(new Sprite(spriteName, spriteFiles, spriteCode, spriteConfig));
            }
            else if (/^assets\/sounds\/.+\/$/.test(relativePath)) {
                const soundName = relativePath.split('/')[2];
                const soundConfig = JSON.parse(await zip.file(`${relativePath}index.json`).async('string'));

                const soundFiles = []
                zip.folder(relativePath).forEach(async (_, file) => {
                    const ext = file.name.split('.').pop()
                    if (Object.keys(audio2mime).includes(ext)) {
                        const mimeType = image2mime[ext]
                        const blob = await file.async('blob')
                        const _file = new File([blob], file.name.split('/').pop(), { type: mimeType });
                        soundFiles.push(_file);
                    }
                });
                project.sounds.push(new Sound(soundName, soundFiles, soundConfig));
            }
            else if (/^assets\/[^\/]+$/.test(relativePath)) {
                const ext = relativePath.split('.').pop()
                const file = zip.file(relativePath);
                const mimeType = image2mime[ext]
                const blob = await file.async('blob');
                const _file = new File([blob], relativePath.split('/').pop(), { type: mimeType });
                project.backdrop.files.push(_file);
            }
        }

        loadProject(project);
    }

    /**
     * Load project from local storage.
     * @param {project} proj
     */
    function loadProject(proj) {
        setBackdrop(new Backdrop(proj.backdrop.files, proj.backdrop.config) || new Backdrop())
        setSprite(proj.sprites.map(sprite => new Sprite(sprite.name, sprite.files, sprite.code, sprite.config)) || [])
        setSound(proj.sounds.map(sound => new Sound(sound.name, sound.files, sound.config)) || [])
        setTitle(proj.title || UNTITLED_NAME)
    }

    /**
     * Load project from IndexedDB.
     */
    async function init() {
        const storedProject = await localForage.getItem('project')
        try {
            storedProject && loadProject(storedProject)
        } catch (error) {
            console.error(error)
        }
    }

    /**
     * Save project to computer.
     */
    async function saveProject2Computer() {
        const zip = new JSZip();

        const zipFileValue = (key, value) => {
            if (typeof value === 'string' || value instanceof File) {
                return [key, value]
            } else {
                return [key, JSON.stringify(value)]
            }
        }

        for (const item of [project.value.sprites, project.value.sounds].flat()) {
            for (const [key, value] of Object.entries(item.dir)) {
                zip.file(...zipFileValue(key, value));
            }
        }

        for (const [key, value] of Object.entries(project.value.backdrop.dir)) {
            zip.file(...zipFileValue(key, value));
        }

        const mainSpx =
            `var (
\t${project.value.sprites.map(sprite => sprite.name + " " + sprite.name).join('\n\t')}
\t${project.value.sounds?.map(sound => sound.name + ' Sound').join('\n\t')}
)

run "assets", {Title: "${project.value.title}"}
`
        zip.file('main.spx', mainSpx, { binary: true });

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `${project.value.title}.zip`);
    }

    init()

    return {
        watchProjectChange,
        resetProject,
        saveProject,
        loadProject,
        loadProjectFromZip,
        saveProject2Computer,
        title,
        project
    }

})
