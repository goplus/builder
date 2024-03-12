/*
 * @Author: TuGitee tgb@std.uestc.edu.cn
 * @Date: 2024-01-19 21:53:50
 * @LastEditors: TuGitee tgb@std.uestc.edu.cn
 * @LastEditTime: 2024-01-25 14:11:09
 * @FilePath: \builder\spx-gui\src\class\sprite.ts
 * @Description: The class of a sprite.
 */

import type { Costume, SpriteConfig } from "@/interface/file";
import { AssetBase } from "./asset-base";
import { isInstance, getAllFromLocal } from "@/util/class";
import type { RawDir } from "@/types/file";

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
 * // create a sprite from raw data
 * const spt3 = Sprite.fromRawData({ name: "banana", _files: [file1, file2], code: "onStart => {}", config: { x: 12, y: 21 } })
 * 
 * // change any params
 * spt2.setCx(23)
 * spt2.setSy(21)
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
 * 
 * // computed current costume
 * spt1.currentCostumeIndex  // 0
 * spt1.currentCostume  // { x: 0, y: 0, name: 'monkey', path: 'monkey.png', ... }
 * spt1.currentCostumeConfig  // { file: File, url: 'blob://...', index: 0, x: 0, y: 0, name: 'monkey', path: 'monkey.png' ... }
 * 
 */

export class Sprite extends AssetBase {
    /**
     * The root path of the sprites.
     */
    static ROOT_PATH = "assets/sprites/"

    /**
     * The regular expression of the sprite.
     */
    static REG_EXP = new RegExp(`^${Sprite.ROOT_PATH}(.+)/(.+)$`)

    /**
     * The code of the sprite.
     */
    code: string

    /**
     * The config of the sprite.
     */
    declare config: SpriteConfig

    /**
     * The name of the sprite.
     */
    static NAME = "sprite"

    /**
     * Get the store name for the sprite.
     * @returns the name of the store
     */
    _getStoreName(): string {
        return Sprite.NAME
    }

    /**
     * Get all items in the storage.
     * @returns all items in the storage
     */
    static async getAllFromLocal() {
        return await getAllFromLocal(Sprite)
    }

    /**
     * @constructor create a new sprite
     * @param {string} name the name of the sprite
     * @param {File[]} files the files of the sprite
     * @param {string} code the code of the sprite
     * @param {SpriteConfig} config the config of the sprite using json to generate `index.json`
     */
    constructor(name: string, files: File[] = [], config?: SpriteConfig, code: string = "\r\n") {
        super(name, files, config)
        this.code = code
    }

    /**
     * Create a new sprite from raw data.
     * @param data the data of the sprite
     * @returns the sprite instance
     */
    static fromRawData(data: any): Sprite {
        return new Sprite(data.name, data._files, data.code, data.config)
    }

    /**
     * Generate the default sprite config.
     * @returns the default config
     */
    _genDefualtConfig(): SpriteConfig {
        return this.defaultConfig
    }

    /**
     * Generate the default sprite config.
     */
    get defaultConfig(): SpriteConfig {
        return {
            "costumes": this.files.map(item => ({
                "name": item.name.split(".")[0],
                "path": item.name,
                "x": 0,
                "y": 0
            })),
            "costumeIndex": 0,
            "heading": 90,
            "isDraggable": false,
            "rotationStyle": "normal",
            "size": 0.5,
            "visible": true,
            "x": 0,
            "y": 0
        }
    }

    /**
     * Get the current costume index.
     */
    get currentCostumeIndex() {
        return this.config.costumeIndex
    }

    /**
     * Set the current costume by index of costume (file).
     */
    set currentCostumeIndex(index: number) {
        if (!this.config.costumes[index]) {
            throw new Error(`Costume ${index} does not exist.`)
        }
        this.config.costumeIndex = index
    }

    /**
     * Get the current costume.
     */
    get currentCostume() {
        const costume = this.config.costumes[this.currentCostumeIndex]
        if (!costume) {
            throw new Error(`Costume ${this.currentCostumeIndex} does not exist.`)
        }
        return costume
    }

    /**
     * Get the current costume with config.
     */
    get currentCostumeConfig(): Costume & SpriteConfig {
        const costume = this.currentCostume
        return Object.assign({}, costume, this.config, {
            index: this.currentCostumeIndex,
            file: this.files[this.currentCostumeIndex],
            url: this.files[this.currentCostumeIndex].url,
            sx: this.config.x,
            sy: this.config.y,
            cx: costume.x as number,
            cy: costume.y
        })
    }

    /**
     * Set the x coordinate of the sprite
     * @param x the x coordinate of the sprite
     */
    setSx(x: number) {
        this.config.x = x
    }

    /**
     * Set the y coordinate of the sprite
     * @param y the y coordinate of the sprite
     */
    setSy(y: number) {
        this.config.y = y
    }

    /**
     * Set the x coordinate of the costume
     * @param x the x coordinate of the costume
     */
    setCx(x: number) {
        this.currentCostume.x = x
    }

    /**
     * Set the y coordinate of the costume
     * @param y the y coordinate of the costume
     */
    setCy(y: number) {
        this.currentCostume.y = y
    }

    /**
     * Set the visibility of the sprite
     * @param visible the visibility of the sprite
     */
    setVisible(visible: boolean) {
        this.config.visible = visible
    }

    /**
     * Set the heading of the sprite
     * @param heading the heading of the sprite
     */
    setHeading(heading: number) {
        this.config.heading = heading
    }

    /**
     * Set the size of the sprite
     * @param size the size of the sprite
     */
    setSize(size: number) {
        this.config.size = size
    }

    /**
     * Get the directory of the sprite.
     */
    get dir() {
        const dir: RawDir = {}
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
        return isInstance(obj, Sprite)
    }
}
