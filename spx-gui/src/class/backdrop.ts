/*
 * @Author: TuGitee tgb@std.uestc.edu.cn
 * @Date: 2024-01-19 21:53:50
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-29 18:00:18
 * @FilePath: \spx-gui\src\class\backdrop.ts
 * @Description: The class of a backdrop.
 */
import type { BackdropConfig } from '@/interface/file'
import { AssetBase } from '@/class/asset-base'
import { isInstance, getAllFromLocal } from '@/util/class'
import type { RawDir } from '@/types/file'
import type FileWithUrl from './file-with-url'

/**
 * @class Backdrop
 *
 * @author tgb
 * @createDate 2024-01-11
 *
 * @example
 * // create a new backdrop
 * const backdrop = new Backdrop()
 * // create a backdrop with all params
 * const backdrop = new Backdrop('bg', [file1, file2], { height: 200 })
 * // create a backdrop from raw data
 * const backdrop = Backdrop.fromRawData({ name: 'bg', _files: [file1, file2], config: { height: 200 } })
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
 *
 */

export class Backdrop extends AssetBase {
  /**
   * The root path of the backdrop.
   */
  static ROOT_PATH = 'assets/'

  /**
   * The regular expression of the backdrop.
   */
  static REG_EXP = new RegExp(`^${Backdrop.ROOT_PATH}([^/]+)$`)

  /**
   * The name of the backdrop.
   */
  static NAME = 'backdrop'

  /**
   * The config of the backdrop.
   */
  declare config: BackdropConfig

  /**
   * Get the store name for the backdrop.
   * @returns the name of the store
   */
  _getStoreName(): string {
    return Backdrop.NAME
  }

  /**
   * Get all items in the storage.
   * @returns all items in the storage
   */
  static async getAllFromLocal() {
    return await getAllFromLocal(Backdrop)
  }


  /**
   * @constructor create a new backdrop
   * @param {string} name the name of the backdrop
   * @param {File[]} files the files of the backdrop
   * @param {BackdropConfig} config the config of the backdrop using json to generate `index.json`
   */
  constructor(name: string = Backdrop.NAME, files: File[] = [], config?: BackdropConfig) {
    super(name, files, config)
  }

  /**
   * Create a new backdrop from raw data.
   * @param data the data of the backdrop
   * @returns the backdrop instance
   */
  static fromRawData(data: any): Backdrop {
    return new Backdrop(data.name, data._files, data.config)
  }

  /**
   * Generate the default backdrop config.
   * @returns the default config
   */
  _genDefualtConfig(): BackdropConfig {
    return this.defaultConfig
  }

  /**
   * Generate the default backdrop config.
   */
  get defaultConfig(): BackdropConfig {
    return {
      scenes: this.files.map((file) => ({
        name: file.name.split('.')[0],
        path: file.name
      })),
      zorder: []
    }
  }

  /**
   * Get the directory of the backdrop.
   */
  get dir() {
    const dir: RawDir = {}
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
    return isInstance(obj, Backdrop)
  }

  /**
   * add scene of the backdrop
   */
  addScene(sceneList: Array<{ name: string; file: FileWithUrl }>) {
    if (this.config.scenes) {
      this.addFile(...sceneList.map((scene) => scene.file))
      this.config.scenes.push(
        ...sceneList.map((scene) => {
          return {
            name: scene.file.name.split('.')[0],
            path: scene.file.name
          }
        })
      )
    }
  }
  /**
   * remove scene by name of the backdrop
   */
  removeScene(name: string) {
    if (this.config.scenes) {
      const index = this.config.scenes.findIndex((scene) => scene.name === name)
      this.removeFile(this.files[index])
      this.config.scenes.splice(index, 1)
    }
  }
  /**
   * When using scene as the background config
   * The first item of scenes is the backdrop of the project
   */
  setSceneToTop(name: string) {
    console.log(name)
    if (this.config.scenes) {
      const index = this.config.scenes.findIndex((scene) => scene.name === name)
      const [sceneItem] = this.config.scenes.splice(index, 1)
      const [fileItem] = this.files.splice(index, 1)
      this.config.scenes.unshift(sceneItem)
      this.files.unshift(fileItem)
    }
  }
}
