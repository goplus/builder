import { AssetBase, asset } from "@/interface/asset";
import { isInstance } from "@/util/class";

/**
 * @class Backdrop
 * 
 * @author tgb
 * @createDate 2024-01-11
 */

export default class Backdrop extends AssetBase implements asset {
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
    name: string = 'Backdrop';

    /**
     * The files of the backdrop.
     */
    files: File[];

    /**
     * The config of the backdrop.
     */
    config: Record<string, any>;

    /**
     * @constructor create a new backdrop
     * @param {File[]} files the files of the backdrop
     * @param {Record<string, any>} config the config of the backdrop using json to generate `index.json`
     */
    constructor(files: File[] = [], config: Record<string, any> = {}) {
        super()
        this.files = files
        this.config = config
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