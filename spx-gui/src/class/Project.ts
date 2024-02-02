import Backdrop from "./backdrop";
import fs from "@/util/FileSystem";
import { FileType, dirPath, rawDir } from "@/types/file";
import { convertDirPathToProject, convertRawDirToDirPath, convertRawDirToZip, getDirPathFromZip } from "@/util/file";
import saveAs from "file-saver";
import { SoundList, SpriteList } from "./AssetList";

interface ProjectData {
    title: string
    sprite: SpriteList
    sound: SoundList
    backdrop: Backdrop
    entryCode: string
    UnidentifiedFile: rawDir
}

export class Project implements ProjectData {
    title: string;
    sprite: SpriteList;
    sound: SoundList;
    backdrop: Backdrop;
    entryCode: string;
    UnidentifiedFile: rawDir;

    static ENTRY_FILE_NAME = 'index.gmx'

    static fromRawData(data: ProjectData): Project {
        return new Project(data.title, data.sprite, data.sound, data.backdrop, data.entryCode, data.UnidentifiedFile)
    }

    constructor(title: string, sprite: SpriteList = new SpriteList(), sound: SoundList = new SoundList(), backdrop: Backdrop = new Backdrop(), entryCode: string = "", UnidentifiedFile: rawDir = {}) {
        this.title = title
        this.sprite = sprite
        this.sound = sound
        this.backdrop = backdrop
        this.entryCode = entryCode
        this.UnidentifiedFile = UnidentifiedFile
    }

    async load(title: string): Promise<void>;
    load(proj: Project): void;
    async load(zipFile: File): Promise<void>;
    load(dirPath: dirPath): void;

    async load(arg: any): Promise<void> {
        if (typeof arg === 'string') {
            const paths = await fs.readdir(arg) as string[]
            const dirPath: dirPath = {}
            for (const path of paths) {
                const content = await fs.readFile(path) as FileType
                dirPath[path] = content
            }
            this.load(dirPath)
        } else if (typeof arg === 'object' && arg instanceof Project) {
            this.title = arg.title
            this.sprite = arg.sprite
            this.sound = arg.sound
            this.backdrop = arg.backdrop
            this.entryCode = arg.entryCode
            this.UnidentifiedFile = arg.UnidentifiedFile
        } else if (typeof arg === 'object' && arg instanceof File) {
            const dirPath = await getDirPathFromZip(arg)
            this.load(dirPath)
        } else {
            const proj = convertDirPathToProject(arg)
            this.load(proj)
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
        const dirPath = await this.dirPath
        for (const path of Object.keys(dirPath)) {
            await fs.unlink(path)
        }
    }

    get path() {
        return this.title + "/"
    }

    get rawDir() {
        const dir: rawDir = {}
        const files: rawDir = Object.assign({}, this.UnidentifiedFile, ...[this.backdrop, ...this.sprite.list, ...this.sound.list].map(item => item.dir))
        files[Project.ENTRY_FILE_NAME] = this.entryCode
        for (const [path, value] of Object.entries(files)) {
            const fullPath = this.path + path
            dir[fullPath] = value
        }
        return dir
    }

    get dirPath(): Promise<dirPath> {
        return convertRawDirToDirPath(this.rawDir)
    }
}