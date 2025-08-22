import { reactive } from 'vue'
import { getWidgetName } from '../common/asset-name'
import { BaseWidget, type BaseWidgetInits, type BaseRawWidgetConfig } from './widget'
import { defaultMapSize } from '../stage'

export type MonitorInits = BaseWidgetInits & {
  label?: string
  /** Name of some global variable, whose value will be rendered in `Monitor` */
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
// There are different targets for monitor, but only `target: ""` is supported, which means use global scope as target
const supportedTarget = ''
// `val` for spx: `getVar:${variableName}`
const prefixForVariable = 'getVar:'

export class Monitor extends BaseWidget {
  label: string
  setLabel(label: string) {
    this.label = label
  }

  /** Name of some global variable, whose value will be rendered in `Monitor` */
  variableName: string
  setVariableName(name: string) {
    this.variableName = name
  }

  constructor(name: string, { label, variableName, ...extraInits }: MonitorInits) {
    super(name, 'monitor', extraInits)
    this.label = label ?? ''
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
    if (target !== supportedTarget) throw new Error(`unsupported target: ${target} for monitor ${name}`)
    if (val == null) throw new Error(`val expected for monitor ${name}`)
    if (!val.startsWith(prefixForVariable)) throw new Error(`unexpected val: ${val} for monitor ${name}`)
    const variableName = val.slice(prefixForVariable.length)
    return new Monitor(name, { ...inits, id, variableName })
  }

  clone(preserveId = false) {
    return new Monitor(this.name, {
      id: preserveId ? this.id : undefined,
      x: this.x,
      y: this.y,
      size: this.size,
      visible: this.visible,
      label: this.label,
      variableName: this.variableName
    })
  }

  export(): RawMonitorConfig {
    return {
      ...super.export(),
      type: 'monitor',
      label: this.label,
      val: `${prefixForVariable}${this.variableName}`,
      mode: supportedMode,
      target: supportedTarget
    }
  }
}
