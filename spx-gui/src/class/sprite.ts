/*
 * @Author: TuGitee tgb@std.uestc.edu.cn
 * @Date: 2024-01-19 21:53:50
 * @LastEditors: TuGitee tgb@std.uestc.edu.cn
 * @LastEditTime: 2024-01-24 08:46:22
 * @FilePath: \builder\spx-gui\src\class\sprite.ts
 * @Description: The class of a sprite.
 */

import file from "@/interface/file";
import AssetBase from "./AssetBase";
import { isInstance } from "@/util/class";

/**
 * @class Sprite
 * 
 * @author tgb
 * @createDate 2024-01-11
 * 
 * @example
 * // create a sprite just with name
 * const spt1 = new Sprite("monkey")
 * // create a sprite with all params
 * const spt2 = new Sprite("banana", [file1, file2], "onStart => {}", { x: 12, y: 21 })
 * 
 * // change any params
 * spt2.name = "banana~~"
 * spt2.code = "onCloned => {}"
 * spt2.config.x = 23
 * 
 * // provide addFile and removeFile method
 * const file = fileDom.target.files[0]   // typeof file ==> File
 * spt1.addFile(file)
 * spt1.removeFile(file)
 * 
 * // check if an obj is an instance of a sound
 * Sprite.isInstance(spt1)  // true
 * Sprite.isInstance([spt1, spt2])  // true
 * Sprite.isInstance("hello")  // false
 * 
 * // conputed path (depend on the name of the sprite)
 * spt1.path  // assets/sprites/monkey
 * spt2.path  // assets/sprites/banana~~
 * 
 * // computed dir
 * spt2.dir  // { "banana~~.spx": "onCloned => {}", "assets/sprites/banana~~/index.json": {x: 23, y: 21}, "assets/sprites/banana~~/[file1.name]": file1, "assets/sprites/banana~~/[file2.name]": file2 }
 */

export default class Sprite extends AssetBase implements file {
    /**
     * The root path of the sprites.
     */
    static ROOT_PATH = "assets/sprites/"

    /**
     * The regular expression of the sprite.
     */
    static REG_EXP = new RegExp(`^${Sprite.ROOT_PATH}(.+)/(.+)$`);

    /**
     * The code of the sprite.
     */
    code: string;

    /**
     * @constructor create a new sprite
     * @param {string} name the name of the sprite
     * @param {File[]} files the files of the sprite
     * @param {string} code the code of the sprite
     * @param {Record<string, any>} config the config of the sprite using json to generate `index.json`
     */
    constructor(name: string, files: File[] = [], code: string = "", config: Record<string, any> = {}) {
        super(name, files, config)
        this.code = code
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

    /**
     * Get the image url of the sprite.
     */
    get imgUrl() {
        // TODO: get image url from files and config.costumes
        return this.files[0].url
    }
}
