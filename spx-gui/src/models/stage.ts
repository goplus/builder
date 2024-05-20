/**
 * @file class Stage
 * @desc Object-model definition for Stage & Costume
 */

import { reactive } from 'vue'
import { filename } from '@/utils/path'
import { toText, type Files, fromText, File } from './common/file'
import { Backdrop, type RawBackdropConfig } from './backdrop'
import { type Size } from './common'
import { ensureValidBackdropName } from './common/asset'

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
  // For compatibility
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
  private codeFile: File | null
  async getCode() {
    if (this.codeFile == null) return ''
    return toText(this.codeFile)
  }
  setCode(code: string) {
    this.codeFile = fromText(stageCodeFileName, code)
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
  async getMapSize(): Promise<Size | null> {
    const { mapWidth: width, mapHeight: height } = this
    if (width != null && height != null) {
      return { width, height }
    }
    if (this.defaultBackdrop != null) {
      return await this.defaultBackdrop.getSize()
    }
    return null
  }

  constructor(codeFile: File | null = null, inits?: Partial<StageInits>) {
    this.codeFile = codeFile
    this.backdrops = []
    this.backdropIndex = inits?.backdropIndex ?? 0
    this.mapWidth = inits?.mapWidth
    this.mapHeight = inits?.mapHeight
    this.mapMode = getMapMode(inits?.mapMode)
    return reactive(this) as this
  }

  static async load(
    {
      scenes: sceneConfigs,
      sceneIndex,
      costumes: costumeConfigs,
      currentCostumeIndex,
      map
    }: RawStageConfig,
    files: Files
  ) {
    // TODO: empty stage
    let codeFile: File | undefined
    for (const codeFilePath of stageCodeFilePaths) {
      if (files[codeFilePath] == null) continue
      codeFile = files[codeFilePath]
      break
    }
    const stage = new Stage(codeFile, {
      backdropIndex: sceneIndex ?? currentCostumeIndex,
      mapWidth: map?.width,
      mapHeight: map?.height,
      mapMode: getMapMode(map?.mode)
    })
    const backdrops = (sceneConfigs ?? costumeConfigs ?? []).map((c) => Backdrop.load(c, files))
    for (const backdrop of backdrops) {
      stage.addBackdrop(backdrop)
    }
    return stage
  }

  export(): [RawStageConfig, Files] {
    const files: Files = {}
    const backdropConfigs: RawBackdropConfig[] = []
    files[stageCodeFilePath] = this.codeFile ?? fromText(stageCodeFileName, '')
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
