/*
 * @Author: Xu Ning
 * @Date: 2024-01-23 18:59:27
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-23 19:13:53
 * @FilePath: /builder/spx-gui/src/class/AssetBase.ts
 * @Description: 
 */
import file from "@/interface/file";
import FileWithUrl from "@/class/FileWithUrl";

/**
 * @abstract
 * @class AssetBase
 * 
 * @author tgb
 * @createDate 2024-01-18
 */
export default abstract class AssetBase implements file {
    protected _files: FileWithUrl[];
    public name: string;
    public config: Record<string, any>;

    constructor(name: string, files: FileWithUrl[] = [], config: Record<string, any> = {}) {
        this.name = name
        this._files = files
        this.config = config
    }

    /**
     * Get files.
     */
    get files(): FileWithUrl[] {
        return this._files
    }

    /**
     * Add file to Asset.
     * @param file File
     */
    addFile(...file: FileWithUrl[]): void {
        let exist = [];
        for (const f of file) {
            if (this._files.find(file => file.name === f.name)) {
                exist.push(f);
                continue;
            }
            this._files.push(f);
        }
        if (exist.length) {
            throw new Error(`All files in ${this.name} must be unique. ${exist.map(file => file.name).join(', ')} already exist.`)
        }
    }

    /**
     * Remove file from Asset.
     * @param file File
     */
    removeFile(file: File): void {
        const index = this._files.indexOf(file);
        if (index > -1) {
            this._files.splice(index, 1);
        }
    }

    /**
     * Load file from URL
     * @param url the url of zip file
     */
    loadFileFromURL(url: string) {
        // TODO
    }
}
