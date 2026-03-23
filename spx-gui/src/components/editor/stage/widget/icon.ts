import type { Widget } from '@/models/spx/widget'
import monitorIcon from './monitor.svg?raw'
import { Monitor } from '@/models/spx/widget/monitor'

export function getIcon(widget: Widget) {
  if (widget instanceof Monitor) return monitorIcon
  throw new Error(`unknown widget type ${(widget as any)?.constructor?.name}`)
}
