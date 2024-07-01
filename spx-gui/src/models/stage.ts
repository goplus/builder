/**
 * @file class Stage
 * @desc Object-model definition for Stage & Costume
 */

import { reactive } from 'vue'
import { filename } from '@/utils/path'
import { toText, type Files, fromText } from './common/file'
import { ensureValidBackdropName } from './common/asset-name'
import type { Size } from './common'
import { Backdrop, type RawBackdropConfig } from './backdrop'

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
  backdrops?: RawBackdropConfig[]
  backdropIndex?: number
  map?: RawMapConfig
  // For compatibility
  scenes?: RawBackdropConfig[]
  sceneIndex?: number
  costumes?: RawBackdropConfig[]
  currentCostumeIndex?: number
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
  private backdropIndex: number
  get defaultBackdrop(): Backdrop | null {
    return this.backdrops[this.backdropIndex] ?? null
  }
  setDefaultBackdrop(name: string) {
    const idx = this.backdrops.findIndex((s) => s.name === name)
    if (idx === -1) throw new Error(`backdrop ${name} not found`)
    this.backdropIndex = idx
  }

  /**
   * Add given backdrop to stage.
   * Note: the backdrop's name may be altered to avoid conflict.
   */
  addBackdrop(backdrop: Backdrop) {
    const newName = ensureValidBackdropName(backdrop.name, this)
    backdrop.setName(newName)
    backdrop.setStage(this)
    this.backdrops.push(backdrop)
  }

  removeBackdrop(name: string): void {
    const idx = this.backdrops.findIndex((s) => s.name === name)
    if (idx === -1) {
      throw new Error(`backdrop ${name} not found`)
    }

    const [removedBackdrop] = this.backdrops.splice(idx, 1)
    removedBackdrop.setStage(null)

    // Maintain current backdrop's index if possible
    if (this.backdropIndex === idx) {
      this.backdropIndex = 0
      // Note that if there is only one backdrop in the array
      // and it is removed, the index will also be set to 0
    } else if (this.backdropIndex > idx) {
      this.backdropIndex = this.backdropIndex - 1
    }
  }

  mapWidth: number
  setMapWidth(mapWidth: number) {
    this.mapWidth = mapWidth
  }

  mapHeight: number
  setMapHeight(mapHeight: number) {
    this.mapHeight = mapHeight
  }

  mapMode: MapMode
  setMapMode(mapMode: MapMode) {
    this.mapMode = mapMode
  }

  getMapSize(): Size {
    return { width: this.mapWidth, height: this.mapHeight }
  }

  constructor(code: string = '', inits?: Partial<StageInits>) {
    this.code = code
    this.backdrops = []
    this.backdropIndex = inits?.backdropIndex ?? 0
    this.mapWidth = inits?.mapWidth ?? 480
    this.mapHeight = inits?.mapHeight ?? 360
    this.mapMode = getMapMode(inits?.mapMode)
    return reactive(this) as this
  }

  static async load(
    {
      backdrops: backdropConfigs,
      backdropIndex,
      scenes: sceneConfigs,
      sceneIndex,
      costumes: costumeConfigs,
      currentCostumeIndex,
      map
    }: RawStageConfig,
    files: Files
  ) {
    // TODO: empty stage
    const codeFilePath = stageCodeFilePaths.find((path) => files[path])
    const code = codeFilePath != null ? await toText(files[codeFilePath]!) : ''
    const stage = new Stage(code, {
      backdropIndex: backdropIndex ?? sceneIndex ?? currentCostumeIndex,
      mapWidth: map?.width,
      mapHeight: map?.height,
      mapMode: getMapMode(map?.mode)
    })
    const backdrops = (backdropConfigs ?? sceneConfigs ?? costumeConfigs ?? []).map((c) =>
      Backdrop.load(c, files)
    )
    for (const backdrop of backdrops) {
      stage.addBackdrop(backdrop)
    }
    return stage
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
      backdrops: backdropConfigs,
      backdropIndex: backdropIndex,
      map: { width: mapWidth, height: mapHeight, mode: mapMode }
    }
    return [config, files]
  }
}

// In Builder we only support repeat and fillRatio
export enum MapMode {
  // fill = 'fill',
  repeat = 'repeat',
  fillRatio = 'fillRatio'
  // fillCut = 'fillCut'
}

function getMapMode(mode?: string): MapMode {
  if (mode === 'repeat') return MapMode.repeat
  return MapMode.fillRatio
}
