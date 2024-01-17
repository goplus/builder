import { AssetBase, asset } from "@/interface/asset";
import { isInstance } from "@/util/class";

/**
 * @class Sprite
 * 
 * @author tgb
 * @createDate 2024-01-11
 */

export default class Sprite extends AssetBase implements asset {
    /**
     * The root path of the sprites.
     */
    static ROOT_PATH = "assets/sprites/"

    /**
     * The regular expression of the sprite.
     */
    static REG_EXP = new RegExp(`^${Sprite.ROOT_PATH}(.+)/(.+)$`);

    /**
     * The name of the sprite.
     */
    name: string;

    /**
     * The files of the sprite.
     */
    files: File[];

    /**
     * The code of the sprite.
     */
    code: string;

    /**
     * The config of the sprite.
     */
    config: Record<string, any>;

    /**
     * @constructor create a new sprite
     * @param {string} name the name of the sprite
     * @param {File[]} files the files of the sprite
     * @param {string} code the code of the sprite
     * @param {Record<string, any>} config the config of the sprite using json to generate `index.json`
     */
    constructor(name: string, files: File[] = [], code: string = "", config: Record<string, any> = {}) {
        super()
        this.name = name
        this.files = files
        this.code = code
        this.config = config
    }

    /**
     * Get the directory of the sprite.
     */
    get dir() {
        const dir: Record<string, any> = {}
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

    /**
     * Check if an object is an instance of a sprite.
     */
    static isInstance(obj: any): boolean {
        return isInstance(obj, Sprite);
    }
}