/*
 * @Author: TuGitee tgb@std.uestc.edu.cn
 * @Date: 2024-01-22 10:28:03
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-19 11:58:52
 * @FilePath: /spx-gui/src/class/asset-base.ts
 * @Description: The abstract class of an asset.
 */
import type { AssetBaseInterface } from "@/interface/file";
import { getStorage } from "@/util/class";
import FileWithUrl from "@/class/file-with-url";
import { isObjectEmpty } from "@/util/global";
import type { Config } from '@/interface/file';

/**
 * @abstract
 * @class AssetBase
 * 
 * @author tgb
 * @createDate 2024-01-18
 */
export abstract class AssetBase implements AssetBaseInterface {
    /**
     * All files.
     * 
     * Due to a flaw in type declarations, `private` or `protected` properties can be lost after a `ref` is created responsive. To solve this problem, all `private` or `protected` properties are identified by starting with `_`, see the link below for more details.
     * 
     * https://github.com/goplus/builder/pull/96#discussion_r1502353497
     */
    _files: FileWithUrl[]

    /**
     * The name of the asset.
     */
    name: string

    /**
     * The config of the asset.
     */
    public config: Config

    constructor(name: string, files: FileWithUrl[] = [], config: Config = {}) {
        this.name = name
        this._files = files
        this.config = this._genConfig(config)
    }

    /**
     * Get files.
     */
    get files(): FileWithUrl[] {
        return this._files
    }

    set files(files: FileWithUrl[]) {
        this._files = files
    }

    /**
     * Add file to Asset.
     * @param file File
     */
    addFile(...file: FileWithUrl[]): void {
        const exist = []
        for (const f of file) {
            if (this._files.find(file => file.name === f.name)) {
                exist.push(f)
                continue
            }
            this._files.push(f)
        }
        if (exist.length) {
            throw new Error(`All files in ${this.name} must be unique. ${exist.map(file => file.name).join(', ')} already exist.`)
        }
    }

    /**
     * Remove file from Asset.
     * @param file File
     */
    removeFile(file: FileWithUrl): void {
        const index = this._files.indexOf(file)
        if (index > -1) {
            this._files.splice(index, 1)
        }
    }

    /**
     * Load file from URL
     * @param url the url of zip file
     */
    loadFileFromURL(url: string) {
        // TODO
        console.log('loadFileFromURL', url)
    }

    /**
     * Get the name of the asset.
     */
    static NAME = "asset"

    /**
     * Save the asset to local storage.
     * @param isCover Whether to overwrite the existing asset. If not, add a suffix to the name.
     */
    async save(isCover = false): Promise<void> {
        const storage = getStorage(this._getStoreName())
        if (isCover) {
            await storage.setItem(this.name, this)
            return
        }
        // Check if the name is unique. If not, add a suffix to the name.
        // For example, if the name is "test", then it will be "test_0", "test_1", and so on.
        const item: AssetBase = JSON.parse(JSON.stringify(this))
        for (let i = 0; ; i++) {
            if (!await storage.getItem(item.name)) break
            item.name = `${this.name}_${i}`
        }
        await storage.setItem(item.name, item)
    }

    /**
     * Remove the asset from local storage.
     */
    async remove(): Promise<void> {
        const storage = getStorage(this._getStoreName())
        await storage.removeItem(this.name)
    }

    /**
     * Get the store name for the asset.
     * This method should be overridden by subclasses.
     */
    abstract _getStoreName(): string

    /**
     * Create a new instance from raw data.
     * This method should be overridden by subclasses.
     */
    public static fromRawData(data: any): AssetBase {
        throw new Error(`[Method] fromRawData not implemented. Please override it. Data: ${data}.`)
    }

    /**
     * Generate a default config.
     * This method should be overridden by subclasses.
     */
    abstract _genDefualtConfig(): Config

    /**
     * Generate the config of the asset.
     * @param config The config of the asset
     * @returns 
     */
    _genConfig<T>(config?: T) {
        return isObjectEmpty(config) ? this._genDefualtConfig() as T : config!
    }
}
