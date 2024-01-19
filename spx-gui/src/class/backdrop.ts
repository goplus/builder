import { asset } from "@/interface/asset";
import { Asset } from "./asset";
import { isInstance } from "@/util/class";

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

export default class Backdrop extends Asset implements asset {
    /**
     * The root path of the backdrop.
     */
    static ROOT_PATH = "assets/"

    /**
     * The regular expression of the backdrop.
     */
    static REG_EXP = new RegExp(`^${Backdrop.ROOT_PATH}([^/]+)$`);

    /**
     * @constructor create a new backdrop
     * @param {File[]} files the files of the backdrop
     * @param {Record<string, any>} config the config of the backdrop using json to generate `index.json`
     */
    constructor(files: File[] = [], config: Record<string, any> = {}) {
        super("Backdrop", files, config)
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