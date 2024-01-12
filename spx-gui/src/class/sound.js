/**
 * @class Sound
 * 
 * @author tgb
 * @createDate 2024-01-11
 */

export default class Sound {
    /**
     * The root path of the sounds.
     */
    static ROOT_PATH = "assets/sounds/"

    /**
     * @constructor create a new sound
     * @param {string} name the name of the sound
     * @param {File[]} files the files of the sound
     * @param {any} config the config of the sound using json to generate `index.json`
     */
    constructor(name, files, config = {}) {
        this.name = name
        this.files = files
        this.config = config
    }

    /**
     * Get the directory of the sound.
     */
    get dir() {
        const dir = {}
        dir[`${this.path}/index.json`] = this.config
        for (const file of this.files) {
            dir[`${this.path}/${file.name}`] = file
        }
        return dir
    }

    /**
     * Get the path of the sound.
     */
    get path() {
        return Sound.ROOT_PATH + this.name
    }
}

/**
 * Check if obj is an instance of Sound
 * @param {any} obj 
 * @returns {boolean}
 */
export const isSound = (obj) => obj instanceof Sound