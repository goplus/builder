/*
 * @Author: TuGitee tgb@std.uestc.edu.cn
 * @Date: 2024-01-19 21:53:50
 * @LastEditors: TuGitee tgb@std.uestc.edu.cn
 * @LastEditTime: 2024-01-24 17:51:47
 * @FilePath: \builder\spx-gui\src\class\backdrop.ts
 * @Description: The class of a backdrop.
 */
import file from "@/interface/file";
import AssetBase from "./AssetBase";
import { isInstance, getAllFromLocal } from "@/util/class";

/**
 * @class Backdrop
 * 
 * @author tgb
 * @createDate 2024-01-11
 * 
 * @example
 * // create a backdrop with all params
 * const backdrop = new Backdrop([file1, file2], { height: 200 })
 * 
 * // change any params
 * backdrop.config.height = 300
 * 
 * // provide addFile and removeFile method
 * const file = fileDom.target.files[0]   // typeof file ==> File
 * backdrop.addFile(file)
 * backdrop.removeFile(file)
 * 
 * // check if an obj is an instance of a backdrop
 * Backdrop.isInstance(backdrop)  // true
 * 
 * // conputed path
 * backdrop.path  // assets/
 * 
 * // computed dir
 * backdrop.dir  // { "assets/index.json": { height: 300 }, "assets/[file1.name]": file1, "assets/[file2.name]": file2 }
 */

export default class Backdrop extends AssetBase implements file {
    /**
     * The root path of the backdrop.
     */
    static ROOT_PATH = "assets/"

    /**
     * The regular expression of the backdrop.
     */
    static REG_EXP = new RegExp(`^${Backdrop.ROOT_PATH}([^/]+)$`);

    /**
     * The name of the backdrop.
     */
    static NAME = "backdrop";

    /**
     * Get the store name for the backdrop.
     * @returns the name of the store
     */
    protected getStoreName(): string {
        return Backdrop.NAME;
    }

    /**
     * Get all items in the storage.
     * @returns all items in the storage
     */
    static async getAllFromLocal() {
        // @ts-ignore
        return await getAllFromLocal(Backdrop);
    }

    /**
     * @constructor create a new backdrop
     * @param {File[]} files the files of the backdrop
     * @param {Record<string, any>} config the config of the backdrop using json to generate `index.json`
     */
    constructor(files: File[] = [], config: Record<string, any> = {}) {
        super("Backdrop", files, config)
    }

    /**
     * Create a new backdrop from raw data.
     * @param data the data of the backdrop
     * @returns the backdrop instance
     */
    static fromRawData(data: any): Backdrop {
        return new Backdrop(data._files, data.config)
    }

    /**
     * Get the directory of the backdrop.
     */
    get dir() {
        const dir: Record<string, any> = {}
        dir[`${this.path}index.json`] = this.config
        for (const file of this.files) {
            dir[`${this.path}${file.name}`] = file
        }
        return dir
    }

    /**
     * Get the path of the backdrop.
     */
    get path() {
        return Backdrop.ROOT_PATH
    }

    /**
     * Check if an object is an instance of a backdrop.
     */
    static isInstance(obj: any): boolean {
        return isInstance(obj, Backdrop);
    }
}