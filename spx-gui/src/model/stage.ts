/**
 * @file class Stage
 * @desc Object-model definition for Stage & Costume
 */

import { reactive } from 'vue';
import { toText, type Files, fromText } from './common/file'
import { Backdrop, type RawBackdropConfig } from './backdrop'
import { filename } from '@/util/path';
import { assign, type Size } from './common';

export type StageConfig = {
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

export const stageCodeFilePaths = [
  'main.spx',
  'index.spx',
  'main.gmx',
  'index.gmx'
]
const stageCodeFilePath = stageCodeFilePaths[0]
const stageCodeFileName = filename(stageCodeFilePath)

export class Stage {

  code: string
  setCode(code: string) {
    this.code = code
  }

  backdrops: Backdrop[]
  get backdrop(): Backdrop | null {
    return this.backdrops[this.config.backdropIndex] ?? null
  }
  removeBackdrop(name: string) {
    const idx = this.backdrops.findIndex(s => s.name === name)
    this.backdrops.splice(idx, 1)
    // TODO: `this.backdropIndex`?
  }
  addBackdrop(backdrop: Backdrop) {
    this.backdrops.push(backdrop)
    // TODO: `this.backdropIndex`?
  }
  topBackdrop(name: string) {
    const idx = this.backdrops.findIndex(s => s.name === name)
    if (idx < 0) throw new Error(`backdrop ${name} not found`)
    const [backdrop] = this.backdrops.splice(idx, 1)
    this.backdrops.unshift(backdrop)
    // TODO: relation to `this.backdropIndex`?
  }

  config: StageConfig
  setConfig(config: Partial<StageConfig>) {
    assign<StageConfig>(this.config, config)
  }

  /** Dicide map size based on map config & backdrop information */
  async getMapSize(): Promise<Size> {
    const { mapWidth: width, mapHeight: height } = this.config
    if (width != null && height != null) {
      return { width, height }
    }
    if (this.backdrop != null) {
      const { width, height } = await this.backdrop.getSize()
      const bitmapResolution = this.backdrop.config.bitmapResolution
      return {
        width: width / bitmapResolution,
        height: height / bitmapResolution
      }
    }
    return { width: 0, height: 0 }
  }

  constructor(code: string, backdrops: Backdrop[], config: Partial<StageConfig>) {
    this.code = code
    this.backdrops = []
    for (const backdrop of backdrops) {
      this.addBackdrop(backdrop)
    }
    this.config = {
      backdropIndex: config.backdropIndex ?? 0,
      mapWidth: config.mapWidth,
      mapHeight: config.mapHeight,
      mapMode: getMapMode(config.mapMode)
    }
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
    const backdrops = (sceneConfigs ?? []).map(c => Backdrop.load(c, files))
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
    const { backdropIndex, mapWidth, mapHeight, mapMode } = this.config
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
