import { reactive } from 'vue'
import { getWidgetName } from '../common/asset-name'
import { BaseWidget, type BaseWidgetInits, type BaseRawWidgetConfig } from './widget'
import { defaultMapSize } from '../stage'

export type MonitorInits = BaseWidgetInits & {
  label?: string
  /** Target name: empty string for stage, sprite name for sprite */
  target?: string
  /** Name of the property on the target, whose value will be rendered in `Monitor` */
  variableName?: string
}

export type RawMonitorConfig = BaseRawWidgetConfig & {
  type: 'monitor'
  mode?: number
  label?: string
  target?: string
  val?: string
}

// There are different modes for monitor, but only `mode: 1` is supported
const supportedMode = 1
// Legacy prefix for `val` field: old configs stored `val` as `getVar:${variableName}`
const legacyValPrefix = 'getVar:'

export class Monitor extends BaseWidget {
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

  constructor(name: string, { label, target, variableName, ...extraInits }: MonitorInits) {
    super(name, 'monitor', extraInits)
    this.label = label ?? ''
    this.target = target ?? ''
    this.variableName = variableName ?? ''
    return reactive(this) as this
  }

  /**
   * Create instance with default inits
   * NOTE: the "default" means default behavior for builder, not the default behavior of spx
   */
  static async create(nameBase: string = 'monitor', inits?: MonitorInits) {
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

  static load({ builder_id: id, type, name, mode, target, val, ...inits }: RawMonitorConfig) {
    if (type !== 'monitor') throw new Error(`unexpected type ${type}`)
    if (name == null) throw new Error('name expected for monitor')
    if (mode !== supportedMode) throw new Error(`unsupported mode: ${mode} for monitor ${name}`)
    if (val == null) throw new Error(`val expected for monitor ${name}`)
    const variableName = val.startsWith(legacyValPrefix) ? val.slice(legacyValPrefix.length) : val
    return new Monitor(name, { ...inits, id, target: target ?? '', variableName })
  }

  clone(preserveId = false) {
    return new Monitor(this.name, {
      id: preserveId ? this.id : undefined,
      x: this.x,
      y: this.y,
      size: this.size,
      visible: this.visible,
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
      mode: supportedMode,
      target: this.target,
      val: this.variableName
    }
  }
}
