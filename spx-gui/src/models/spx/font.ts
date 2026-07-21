import { reactive } from 'vue'

import { join } from '@/utils/path'
import { createFileWithWebUrl } from '../common/cloud'
import { File, fromConfig, listDirs, toConfig, type Files } from '../common/file'

export const fontAssetPath = 'assets/fonts'
const fontConfigFileName = 'index.json'

type RawFontConfig = {
  faces?: { path?: string }[]
}

export class FontFamily {
  name: string
  file: File

  constructor(name: string, file: File) {
    this.name = name
    this.file = file
    return reactive(this) as this
  }

  static async load(name: string, files: Files) {
    const prefix = join(fontAssetPath, name)
    const configFile = files[join(prefix, fontConfigFileName)]
    if (configFile == null) throw new Error(`font configuration not found for ${name}`)
    const config = (await toConfig(configFile)) as RawFontConfig
    if (config.faces?.length !== 1) throw new Error(`font family ${name} must have exactly one face`)
    const path = config.faces[0].path
    if (path == null) throw new Error(`font file path not found for ${name}`)
    const file = files[join(prefix, path)]
    if (file == null) throw new Error(`font file not found for ${name}: ${path}`)
    return new FontFamily(name, file)
  }

  static async loadAll(files: Files) {
    const names = listDirs(files, fontAssetPath)
    return Promise.all(names.map((name) => FontFamily.load(name, files)))
  }

  export(): Files {
    const prefix = join(fontAssetPath, this.name)
    const config: RawFontConfig = { faces: [{ path: this.file.name }] }
    return {
      [join(prefix, fontConfigFileName)]: fromConfig(fontConfigFileName, config),
      [join(prefix, this.file.name)]: this.file
    }
  }
}

export const basicChineseFontFamilyName = 'basic-chinese'

const basicChineseFontUrl = new URL('../../assets/fonts/basic-chinese/NotoSansCJKsc-Regular.otf', import.meta.url).href

export function createBasicChineseFontFamily() {
  return new FontFamily(
    basicChineseFontFamilyName,
    createFileWithWebUrl(basicChineseFontUrl, 'NotoSansCJKsc-Regular.otf')
  )
}
