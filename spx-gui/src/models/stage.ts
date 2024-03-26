/**
 * @file class Stage
 * @desc Object-model definition for Stage & Costume
 */

import { reactive } from 'vue'
import { filename } from '@/utils/path'
import { toText, type Files, fromText } from './common/file'
import { Backdrop, type RawBackdropConfig } from './backdrop'
import { type Size } from './common'

export type StageInits = {
  backdropIndex: number
  mapWidth?: number
  mapHeight?: number
  mapMode: MapMode
}

export type RawMapConfig = {
  width?: number
  height?: number
  mode?: string
}

export type RawStageConfig = {
  scenes?: RawBackdropConfig[]
  sceneIndex?: number
  map?: RawMapConfig
  // TODO:
  // costumes: CostumeConfig[]
  // currentCostumeIndex: number
}

export type MapSize = {
  width: number
  height: number
}

export const stageCodeFilePaths = ['main.spx', 'index.spx', 'main.gmx', 'index.gmx']
const stageCodeFilePath = stageCodeFilePaths[0]
const stageCodeFileName = filename(stageCodeFilePath)

export class Stage {
  code: string
  setCode(code: string) {
    this.code = code
  }

  backdrops: Backdrop[]
  backdropIndex: number
  get backdrop(): Backdrop | null {
    return this.backdrops[this.backdropIndex] ?? null
  }
  setbackdropIndex(backdropIndex: number) {
    this.backdropIndex = backdropIndex
  }
  removeBackdrop(name: string) {
    const idx = this.backdrops.findIndex((s) => s.name === name)
    this.backdrops.splice(idx, 1)
    // TODO: `this.backdropIndex`?
  }
  addBackdrop(backdrop: Backdrop) {
    this.backdrops.push(backdrop)
    // TODO: `this.backdropIndex`?
  }
  topBackdrop(name: string) {
    const idx = this.backdrops.findIndex((s) => s.name === name)
    if (idx < 0) throw new Error(`backdrop ${name} not found`)
    const [backdrop] = this.backdrops.splice(idx, 1)
    this.backdrops.unshift(backdrop)
    // TODO: relation to `this.backdropIndex`?
  }

  mapWidth: number | undefined
  setMapWidth(mapWidth: number) {
    this.mapWidth = mapWidth
  }

  mapHeight: number | undefined
  setMapHeight(mapHeight: number) {
    this.mapHeight = mapHeight
  }

  mapMode: MapMode
  setMapMode(mapMode: MapMode) {
    this.mapMode = mapMode
  }

  /** Dicide map size based on map config & backdrop information */
  async getMapSize(): Promise<Size> {
    const { mapWidth: width, mapHeight: height } = this
    if (width != null && height != null) {
      return { width, height }
    }
    if (this.backdrop != null) {
      const { width, height } = await this.backdrop.getSize()
      const bitmapResolution = this.backdrop.bitmapResolution
      return {
        width: width / bitmapResolution,
        height: height / bitmapResolution
      }
    }
    return { width: 0, height: 0 }
  }

  constructor(code: string, backdrops: Backdrop[], inits: Partial<StageInits>) {
    this.code = code
    this.backdrops = []
    for (const backdrop of backdrops) {
      this.addBackdrop(backdrop)
    }
    this.backdropIndex = inits.backdropIndex ?? 0
    this.mapWidth = inits.mapWidth
    this.mapHeight = inits.mapHeight
    this.mapMode = getMapMode(inits.mapMode)
    return reactive(this)
  }

  static async load({ scenes: sceneConfigs, sceneIndex, map }: RawStageConfig, files: Files) {
    // TODO: empty stage
    let code = ''
    for (const codeFilePath of stageCodeFilePaths) {
      const codeFile = files[codeFilePath]
      if (codeFile == null) continue
      code = await toText(codeFile)
      break
    }
    const backdrops = (sceneConfigs ?? []).map((c) => Backdrop.load(c, files))
    return new Stage(code, backdrops, {
      backdropIndex: sceneIndex,
      mapWidth: map?.width,
      mapHeight: map?.height,
      mapMode: getMapMode(map?.mode)
    })
  }

  export(): [RawStageConfig, Files] {
    const files: Files = {}
    const backdropConfigs: RawBackdropConfig[] = []
    files[stageCodeFilePath] = fromText(stageCodeFileName, this.code)
    for (const backdrop of this.backdrops) {
      const [backdropConfig, backdropFiles] = backdrop.export()
      backdropConfigs.push(backdropConfig)
      Object.assign(files, backdropFiles)
    }
    const { backdropIndex, mapWidth, mapHeight, mapMode } = this
    const config: RawStageConfig = {
      scenes: backdropConfigs,
      sceneIndex: backdropIndex,
      map: { width: mapWidth, height: mapHeight, mode: mapMode }
    }
    return [config, files]
  }
}

export enum MapMode {
  fill = 'fill',
  repeat = 'repeat',
  fillRatio = 'fillRatio',
  fillCut = 'fillCut'
}

function getMapMode(mode?: string): MapMode {
  if (mode === 'repeat') return MapMode.repeat
  if (mode === 'fillCut') return MapMode.fillCut
  if (mode === 'fillRatio') return MapMode.fillRatio
  return MapMode.fill
}
