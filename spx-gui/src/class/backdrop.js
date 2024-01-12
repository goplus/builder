/**
 * @class Backdrop
 * 
 * @author tgb
 * @createDate 2024-01-11
 */

export default class Backdrop {
    /**
     * The root path of the backdrop.
     */
    static ROOT_PATH = "assets/"

    /**
     * @constructor create a new backdrop
     * @param {File[]} files the files of the backdrop
     * @param {any} config the config of the backdrop using json to generate `index.json`
     */
    constructor(files, config = {}) {
        this.files = files
        this.config = config
    }

    /**
     * Get the directory of the backdrop.
     */
    get dir() {
        const dir = {}
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
}

/**
 * Check if obj is an instance of Backdrop
 * @param {any} obj 
 * @returns {boolean}
 */
export const isBackdrop = (obj) => obj instanceof Backdrop