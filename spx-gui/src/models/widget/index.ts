import { Monitor } from './monitor'

export type RawWidgetConfig = {
  type?: string
  name?: string
  [key: string]: unknown | undefined
}

export type Widget = Monitor // | ...

export type WidgetType = 'monitor' // | ...

/** Load different types of widget based on `type` */
export function loadWidget(config: RawWidgetConfig) {
  if (config.type === 'monitor') return Monitor.load({ ...config, type: 'monitor' })
  throw new Error(`unknown widget type ${config.type}`)
}
