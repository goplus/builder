/**
 * @file class Stage
 * @desc Object-model definition for Stage & Costume
 */

import { reactive } from 'vue'
import { filename } from '@/utils/path'
import { toText, type Files, fromText } from './common/file'
import { ensureValidBackdropName, ensureValidWidgetName } from './common/asset-name'
import type { Size } from './common'
import { Backdrop, type RawBackdropConfig } from './backdrop'
import { type RawWidgetConfig, type Widget, loadWidget } from './widget'
import { Disposable } from '@/utils/disposable'

export type StageInits = {
  backdropIndex: number
  mapWidth?: number
  mapHeight?: number
  mapMode?: MapMode
  physics?: Physics
  layerSortMode?: LayerSortMode
  /** Additional config not recognized by builder */
  extraConfig?: object
}

type RawMapConfig = {
  width?: number
  height?: number
  mode?: string
}

type RawPhysicsConfig = {
  /** If physics engine enabled */
  physics?: boolean
  /** Global gravity scaling factor, default 1 */
  globalGravity?: number
  /** Global friction scaling factor, default 1 */
  globalFriction?: number
  /** Global air drag scaling factor, default 1 */
  globalAirDrag?: number
}

export type RawStageConfig = RawPhysicsConfig & {
  backdrops?: RawBackdropConfig[]
  backdropIndex?: number
  widgets?: RawWidgetConfig[]
  map?: RawMapConfig
  // For compatibility
  scenes?: RawBackdropConfig[]
  sceneIndex?: number
  costumes?: RawBackdropConfig[]
  currentCostumeIndex?: number
  layerSortMode?: LayerSortMode
}

export type MapSize = {
  width: number
  height: number
}

export type Physics = {
  enabled: boolean
  gravity?: number
  friction?: number
  airDrag?: number
}

export enum LayerSortMode {
  Normal = '',
  Vertical = 'vertical'
}

export const stageCodeFilePaths = ['main.spx', 'index.spx', 'main.gmx', 'index.gmx']
const stageCodeFilePath = stageCodeFilePaths[0]
const stageCodeFileName = filename(stageCodeFilePath)

export const defaultMapSize: MapSize = { width: 480, height: 360 }

export class Stage extends Disposable {
  code: string
  setCode(code: string) {
    this.code = code
  }
  codeFilePath = stageCodeFilePath

  backdrops: Backdrop[]
  private backdropIndex: number
  get defaultBackdrop(): Backdrop | null {
    return this.backdrops[this.backdropIndex] ?? null
  }
  setDefaultBackdrop(id: string) {
    const idx = this.backdrops.findIndex((s) => s.id === id)
    if (idx === -1) throw new Error(`backdrop ${id} not found`)
    this.backdropIndex = idx
  }

  /**
   * Add given backdrop to stage.
   * NOTE: the backdrop's name may be altered to avoid conflict.
   */
  addBackdrop(backdrop: Backdrop) {
    const newName = ensureValidBackdropName(backdrop.name, this)
    backdrop.setName(newName)
    backdrop.setStage(this)
    this.backdrops.push(backdrop)
  }

  removeBackdrop(id: string): void {
    const idx = this.backdrops.findIndex((s) => s.id === id)
    if (idx === -1) {
      throw new Error(`backdrop ${name} not found`)
    }

    const [removedBackdrop] = this.backdrops.splice(idx, 1)
    removedBackdrop.setStage(null)

    // Maintain current backdrop's index if possible
    if (this.backdropIndex === idx) {
      this.backdropIndex = 0
      // NOTE: if there is only one backdrop in the array
      // and it is removed, the index will also be set to 0
    } else if (this.backdropIndex > idx) {
      this.backdropIndex = this.backdropIndex - 1
    }
  }

  /** Move a backdrop within the backdrops array, without changing the default backdrop */
  moveBackdrop(from: number, to: number) {
    if (from < 0 || from >= this.backdrops.length) throw new Error(`invalid from index: ${from}`)
    if (to < 0 || to >= this.backdrops.length) throw new Error(`invalid to index: ${to}`)
    if (from === to) return
    const backdrop = this.backdrops[from]
    const defaultBackdropId = this.defaultBackdrop?.id ?? null
    this.backdrops.splice(from, 1)
    this.backdrops.splice(to, 0, backdrop)
    if (defaultBackdropId != null) this.setDefaultBackdrop(defaultBackdropId)
  }

  widgets: Widget[]
  /** Zorder for widgets, will be merged with sprites in model `Project` */
  widgetsZorder: string[]

  /**
   * Add given widget to stage.
   * NOTE: the widget's name may be altered to avoid conflict.
   */
  addWidget(widget: Widget) {
    const newName = ensureValidWidgetName(widget.name, this)
    widget.setName(newName)
    widget.setStage(this)
    widget.addDisposer(() => widget.setStage(null))
    this.widgets.push(widget)

    if (!this.widgetsZorder.includes(widget.id)) {
      this.widgetsZorder = [...this.widgetsZorder, widget.id]
    }
  }
  removeWidget(id: string): void {
    const idx = this.widgets.findIndex((s) => s.id === id)
    if (idx === -1) {
      throw new Error(`widget ${id} not found`)
    }

    const [widget] = this.widgets.splice(idx, 1)
    widget.dispose()

    this.widgetsZorder = this.widgetsZorder.filter((v) => v !== id)
  }
  /**
   * Move a widget within the widgets array, without changing the widget zorder
   * TODO: Consider merging this with set-widget-zorder
   */
  moveWidget(from: number, to: number) {
    if (from < 0 || from >= this.widgets.length) throw new Error(`invalid from index: ${from}`)
    if (to < 0 || to >= this.widgets.length) throw new Error(`invalid to index: ${to}`)
    if (from === to) return
    const widget = this.widgets[from]
    this.widgets.splice(from, 1)
    this.widgets.splice(to, 0, widget)
  }
  private setWidgetZorderIdx(id: string, newIdx: number | ((idx: number, length: number) => number)) {
    const idx = this.widgetsZorder.findIndex((v) => v === id)
    if (idx < 0) throw new Error(`widget ${id} not found in zorder`)
    const newIdxVal = typeof newIdx === 'function' ? newIdx(idx, this.widgetsZorder.length) : newIdx
    const newZorder = this.widgetsZorder.filter((v) => v !== id)
    newZorder.splice(newIdxVal, 0, id)
    this.widgetsZorder = newZorder
  }
  upWidgetZorder(id: string) {
    this.setWidgetZorderIdx(id, (i, len) => Math.min(i + 1, len - 1))
  }
  downWidgetZorder(id: string) {
    this.setWidgetZorderIdx(id, (i) => Math.max(i - 1, 0))
  }
  topWidgetZorder(id: string) {
    this.setWidgetZorderIdx(id, (_, len) => len - 1)
  }
  bottomWidgetZorder(id: string) {
    this.setWidgetZorderIdx(id, 0)
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

  physics: Physics
  setPhysics(physics: Physics) {
    this.physics = physics
  }

  layerSortMode: LayerSortMode
  setLayerSortMode(layerSortMode: LayerSortMode) {
    this.layerSortMode = layerSortMode
  }

  extraConfig: object
  setExtraConfig(extraConfig: object) {
    this.extraConfig = extraConfig
  }

  constructor(code: string = '', inits?: Partial<StageInits>) {
    super()
    this.code = code
    this.backdrops = []
    this.backdropIndex = inits?.backdropIndex ?? 0
    this.widgets = []
    this.widgetsZorder = []
    this.addDisposer(() => {
      this.widgets.splice(0).forEach((w) => w.dispose())
      this.widgetsZorder = []
    })
    this.mapWidth = inits?.mapWidth ?? defaultMapSize.width
    this.mapHeight = inits?.mapHeight ?? defaultMapSize.height
    this.mapMode = inits?.mapMode ?? MapMode.fillRatio
    this.physics = inits?.physics ?? { enabled: false }
    this.layerSortMode = inits?.layerSortMode ?? LayerSortMode.Normal
    this.extraConfig = inits?.extraConfig ?? {}
    return reactive(this) as this
  }

  static async load(
    {
      backdrops: backdropConfigs,
      backdropIndex,
      widgets: widgetConfigs,
      scenes: sceneConfigs,
      sceneIndex,
      costumes: costumeConfigs,
      currentCostumeIndex,
      map,
      physics: physicsEnabled,
      globalGravity,
      globalFriction,
      globalAirDrag,
      layerSortMode,
      ...extraConfig
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
      mapMode: getMapMode(map?.mode),
      layerSortMode,
      extraConfig
    })
    const backdrops = (backdropConfigs ?? sceneConfigs ?? costumeConfigs ?? []).map((c) => Backdrop.load(c, files))
    for (const backdrop of backdrops) {
      stage.addBackdrop(backdrop)
    }
    const widgets = (widgetConfigs ?? []).map((c) => loadWidget(c))
    for (const widget of widgets) {
      stage.addWidget(widget)
    }
    stage.setPhysics({
      enabled: physicsEnabled === true,
      gravity: globalGravity,
      friction: globalFriction,
      airDrag: globalAirDrag
    })
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
    const widgetsConfig: RawWidgetConfig[] = this.widgetsZorder.map((id) => {
      const widget = this.widgets.find((w) => w.id === id)
      if (widget == null) throw new Error(`widget ${id} not found`)
      return widget.export()
    })
    const config: RawStageConfig = {
      backdrops: backdropConfigs,
      backdropIndex: backdropIndex,
      widgets: widgetsConfig,
      map: { width: mapWidth, height: mapHeight, mode: mapMode },
      physics: this.physics.enabled,
      globalGravity: this.physics.gravity,
      globalFriction: this.physics.friction,
      globalAirDrag: this.physics.airDrag,
      layerSortMode: this.layerSortMode,
      ...this.extraConfig
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
