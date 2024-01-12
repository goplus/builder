/**
 * @class Sprite
 * 
 * @author tgb
 * @createDate 2024-01-11
 */
export default class Sprite {
    /**
     * The root path of the sprites.
     */
    static ROOT_PATH = "assets/sprites/"

    /**
     * @constructor create a new sprite
     * @param {string} name the name of the sprite
     * @param {File[]} files the files of the sprite
     * @param {string} code the code of the sprite
     * @param {any} config the config of the sprite using json to generate `index.json`
     */
    constructor(name, files, code = "", config = {}) {
        this.name = name
        this.files = files
        this.code = code
        this.config = config
    }

    /**
     * Get the directory of the sprite.
     */
    get dir() {
        const dir = {}
        dir[`${this.path}/index.json`] = this.config
        for (const file of this.files) {
            dir[`${this.path}/${file.name}`] = file
        }
        dir[`${this.name}.spx`] = this.code
        return dir
    }

    /**
     * Get the path of the sprite.
     */
    get path() {
        return Sprite.ROOT_PATH + this.name
    }
}

/**
 * Check if obj is an instance of Sprite
 * @param {any} obj 
 * @returns {boolean}
 */
export const isSprite = (obj) => obj instanceof Sprite