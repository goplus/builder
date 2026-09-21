import { reactive } from 'vue'
import { getWidgetName } from '../common/asset-name'
import { BaseWidget, type BaseWidgetInits, type BaseRawWidgetConfig } from './widget'
import { defaultMapSize } from '../stage'

/** Monitor display mode: 1 for the default readout, 2 for the large readout, 3 for the slider, 4 for the list. */
export type MonitorMode = 1 | 2 | 3 | 4

/** Monitor visual style: `default` for the standard appearance, `scratch` for Scratch-compatible rendering. */
export type MonitorStyle = 'default' | 'scratch'

export type MonitorInits = BaseWidgetInits & {
  mode?: MonitorMode
  style?: MonitorStyle
  sliderMin?: number
  sliderMax?: number
  isDiscrete?: boolean
  width?: number
  height?: number
  label?: string
  /** Target name: empty string for stage, sprite name for sprite */
  target?: string
  /** Name of the property on the target, whose value will be rendered in `Monitor` */
  variableName?: string
}

export type RawMonitorConfig = BaseRawWidgetConfig & {
  type: 'monitor'
  mode?: number
  style?: string
  sliderMin?: number
  sliderMax?: number
  isDiscrete?: boolean
  width?: number
  height?: number
  label?: string
  target?: string
  val?: string
}

const supportedModes: MonitorMode[] = [1, 2, 3, 4]
const supportedStyles: MonitorStyle[] = ['default', 'scratch']
const defaultMonitorStyle = 'default'
function isMonitorMode(mode: number): mode is MonitorMode {
  return supportedModes.includes(mode as MonitorMode)
}
function isMonitorStyle(style: string): style is MonitorStyle {
  return supportedStyles.includes(style as MonitorStyle)
}
// Legacy prefix for `val` field: old configs stored `val` as `getVar:${variableName}`
const legacyValPrefix = 'getVar:'

export class Monitor extends BaseWidget {
  mode: MonitorMode
  style: MonitorStyle
  sliderMin: number
  sliderMax: number
  isDiscrete: boolean
  width: number
  height: number

  label: string
  setLabel(label: string) {
    this.label = label
  }

  /**
   * Target name: empty string for stage, sprite name for sprite.
   * Unlike other id-based references (e.g., animation→sound, sprite→animation, zorder→sprite),
   * here we store the name directly because Monitor's export/load doesn't have access to the
   * project's sprite list. Sprite renames are handled by manually syncing in `useRenameSprite`.
   */
  target: string
  setTarget(target: string) {
    this.target = target
  }

  /** Name of the property on the target, whose value will be rendered in `Monitor` */
  variableName: string
  setVariableName(name: string) {
    this.variableName = name
  }

  constructor(
    name: string,
    {
      mode,
      style,
      sliderMin,
      sliderMax,
      isDiscrete,
      width,
      height,
      label,
      target,
      variableName,
      ...extraInits
    }: MonitorInits
  ) {
    super(name, 'monitor', extraInits)
    this.mode = mode ?? 1
    this.style = style ?? defaultMonitorStyle
    this.sliderMin = sliderMin ?? 0
    this.sliderMax = sliderMax ?? 100
    this.isDiscrete = isDiscrete ?? true
    this.width = width ?? 0
    this.height = height ?? 0
    this.label = label ?? ''
    this.target = target ?? ''
    this.variableName = variableName ?? ''
    return reactive(this) as this
  }

  /**
   * Create instance with default inits
   * NOTE: the "default" means default behavior for builder, not the default behavior of spx
   */
  static async create(nameBase: string, inits?: MonitorInits) {
    return new Monitor(getWidgetName(null, nameBase), {
      // Default position: the left-top corner with margin 10
      // TODO: calculate initial position based on current stage size & existed widgets
      x: 10 - defaultMapSize.width / 2,
      y: defaultMapSize.height / 2 - 10,
      visible: true,
      label: 'Label',
      ...inits
    })
  }

  static load({ builder_id: id, type, name, mode, style, target, val, ...inits }: RawMonitorConfig) {
    if (type !== 'monitor') throw new Error(`unexpected type ${type}`)
    if (name == null) throw new Error('name expected for monitor')
    if (mode == null || !isMonitorMode(mode)) {
      throw new Error(`unsupported mode: ${mode} for monitor ${name}`)
    }
    if (val == null) throw new Error(`val expected for monitor ${name}`)
    const variableName = val.startsWith(legacyValPrefix) ? val.slice(legacyValPrefix.length) : val
    return new Monitor(name, {
      ...inits,
      id,
      mode,
      style: style != null && isMonitorStyle(style) ? style : defaultMonitorStyle,
      target: target ?? '',
      variableName
    })
  }

  clone(preserveId = false) {
    return new Monitor(this.name, {
      id: preserveId ? this.id : undefined,
      x: this.x,
      y: this.y,
      size: this.size,
      visible: this.visible,
      mode: this.mode,
      style: this.style,
      sliderMin: this.sliderMin,
      sliderMax: this.sliderMax,
      isDiscrete: this.isDiscrete,
      width: this.width,
      height: this.height,
      label: this.label,
      target: this.target,
      variableName: this.variableName
    })
  }

  export(): RawMonitorConfig {
    return {
      ...super.export(),
      type: 'monitor',
      label: this.label,
      mode: this.mode,
      style: this.style,
      target: this.target,
      val: this.variableName,
      ...(this.mode === 3 ? { sliderMin: this.sliderMin, sliderMax: this.sliderMax, isDiscrete: this.isDiscrete } : {}),
      ...(this.mode === 4 ? { width: this.width, height: this.height } : {})
    }
  }
}
