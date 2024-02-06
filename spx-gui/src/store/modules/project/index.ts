/*
 * @Author: TuGitee tgb@std.uestc.edu.cn
 * @Date: 2024-01-22 11:26:18
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-02-05 17:32:55
 * @FilePath: /spx-gui/src/store/modules/project/index.ts
 * @Description: The store of project.
 */

import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import * as fs from '@/util/file-system'
import type { FileType, DirPath, RawDir } from "@/types/file";
import { convertDirPathToProject, convertRawDirToDirPath, convertRawDirToZip, getDirPathFromZip } from "@/util/file";
import saveAs from "file-saver";
import { SoundList, SpriteList } from "@/class/asset-list";
import { Backdrop } from '@/class/backdrop';

const UNTITLED_NAME = 'Untitled'
interface ProjectData {
    title: string
    sprite: SpriteList
    sound: SoundList
    backdrop: Backdrop
    entryCode: string
    UnidentifiedFile: RawDir
}

export class Project implements ProjectData {
    title: string;
    sprite: SpriteList;
    sound: SoundList;
    backdrop: Backdrop;
    entryCode: string;
    UnidentifiedFile: RawDir;

    static ENTRY_FILE_NAME = 'index.gmx'

    static fromRawData(data: ProjectData): Project {
        return new Project(data.title, data.sprite, data.sound, data.backdrop, data.entryCode, data.UnidentifiedFile)
    }

    constructor(title: string, sprite: SpriteList = new SpriteList(), sound: SoundList = new SoundList(), backdrop: Backdrop = new Backdrop(), entryCode: string = "", UnidentifiedFile: RawDir = {}) {
        this.title = title
        this.sprite = sprite
        this.sound = sound
        this.backdrop = backdrop
        this.entryCode = entryCode
        this.UnidentifiedFile = UnidentifiedFile
    }

    /**
     * Load project from storage.
     * @param title The name of project
     */
    async load(title: string): Promise<void>;

    /**
     * Load project from zip file.
     * @param zipFile The zip file
     */
    async load(zipFile: File, title?: string): Promise<void>;

    async load(arg: string | File, title?: string): Promise<void>;

    async load(arg: string | File, title?: string): Promise<void> {
        if (typeof arg === 'string') {
            const paths = await fs.readdir(arg) as string[]
            const dirPath: DirPath = {}
            for (const path of paths) {
                const content = await fs.readFile(path) as FileType
                dirPath[path] = content
            }
            this._load(dirPath)
        } else if (typeof arg === 'object' && arg instanceof File) {
            const dirPath = await getDirPathFromZip(arg, title || UNTITLED_NAME)
            this._load(dirPath)
        }
    }

    /**
     * Load project from directory.
     * @param DirPath The directory
     */
    private _load(dirPath: DirPath): void;

    /**
     * Load project.
     * @param proj The project
     */
    private _load(proj: Project): void;

    private _load(arg: DirPath | Project): void {
        if (typeof arg === 'object' && arg instanceof Project) {
            this.title = arg.title
            this.sprite = arg.sprite
            this.sound = arg.sound
            this.backdrop = arg.backdrop
            this.entryCode = arg.entryCode
            this.UnidentifiedFile = arg.UnidentifiedFile
        } else {
            const proj = convertDirPathToProject(arg)
            this._load(proj)
        }
    }

    async save() {
        const dirPath = await this.dirPath
        for (const [key, value] of Object.entries(dirPath)) {
            await fs.writeFile(key, value)
        }
    }

    async saveToComputer() {
        const content = await convertRawDirToZip(this.rawDir)
        const title = this.title
        saveAs(content, `${title}.zip`)
    }

    async remove() {
        await fs.rmdir(this.path)
    }

    get path() {
        return this.title + "/"
    }

    get rawDir() {
        const dir: RawDir = {}
        const files: RawDir = Object.assign({}, this.UnidentifiedFile, ...[this.backdrop, ...this.sprite.list, ...this.sound.list].map(item => item.dir))
        files[Project.ENTRY_FILE_NAME] = this.entryCode
        for (const [path, value] of Object.entries(files)) {
            const fullPath = this.path + path
            dir[fullPath] = value
        }
        return dir
    }

    get dirPath(): Promise<DirPath> {
        return convertRawDirToDirPath(this.rawDir)
    }
}

export const useProjectStore = defineStore('project', () => {
    const project = ref(new Project(UNTITLED_NAME))

    /**
     * while project changed, save it to storage.
     */
    watch(() => project.value, async () => {
        console.log('project changed', project.value);
        await project.value.remove()
        await project.value.save()
    }, { deep: true })

    /**
     * Load project.
     */
    const loadProject = async (arg: string | File, title?: string) => {
        const newProject = new Project(UNTITLED_NAME)
        await newProject.load(arg, title)
        project.value = newProject
    }

    /**
     * Get the list of local projects.
     * @returns The list of local projects' name
     * 
     * @example
     * const projects = await getLocalProjects()  // ['project1', 'project2']
     * project.load(projects[0])
     */
    const getLocalProjects = async (): Promise<string[]> => {
        const dir = await fs.readdir('')
        const map = new Map()
        for (const path of dir) {
            const k = path.split('/').shift()
            if (!k) continue
            if (!map.has(k)) {
                map.set(k, true)
            }
        }
        return Array.from(map.keys())
    }

    return {
        project,
        getLocalProjects,
        loadProject
    }
})
