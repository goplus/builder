import { Sprite } from '@/models/sprite'
import type { Widget } from '@/models/widget'

/** Get name which identifies the node, which may be a sprite or a widget */
export function getNodeId(target: Sprite | Widget) {
  const type = target instanceof Sprite ? 'sprite' : 'widget'
  return `${type}:${target.id}`
}
