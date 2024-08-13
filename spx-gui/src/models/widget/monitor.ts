import { reactive } from 'vue'
import { getWidgetName } from '../common/asset-name'
import { BaseWidget, type BaseWidgetInits } from './widget'

export type MonitorInits = BaseWidgetInits & {
  label?: string
  value?: string
}

export type RawMonitorConfig = MonitorInits & {
  type: 'MonitorWidget'
  name?: string
}

export class Monitor extends BaseWidget {
  label: string
  setLabel(label: string) {
    this.label = label
  }

  /** Name of some global variable, whose value will be rendered in `Monitor` */
  value: string
  setValue(value: string) {
    this.value = value
  }

  constructor(name: string, { label, value, ...extraInits }: MonitorInits) {
    super(name, extraInits)
    this.label = label ?? ''
    this.value = value ?? ''
    return reactive(this) as this
  }

  /**
   * Create instance with default inits
   * Note that the "default" means default behavior for builder, not the default behavior of spx
   */
  static async create(nameBase: string = 'monitor', inits?: MonitorInits) {
    return new Monitor(getWidgetName(null, nameBase), {
      // `x: -230, y: 170` is the left-top corner with margin 10
      // TODO: calculate initial position based on stage size & existed widgets
      x: -230,
      y: 170,
      visible: true,
      label: 'Label',
      ...inits
    })
  }

  static load({ name, ...inits }: RawMonitorConfig) {
    if (name == null) throw new Error(`name expected for monitor`)
    return new Monitor(name, inits)
  }

  export(): RawMonitorConfig {
    return {
      ...super.export(),
      type: 'MonitorWidget',
      label: this.label,
      value: this.value
    }
  }
}
