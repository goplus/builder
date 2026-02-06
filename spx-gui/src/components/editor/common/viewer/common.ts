import { Sprite } from '@/models/sprite'
import type { Widget } from '@/models/widget'
import type { KonvaEventObject } from 'konva/lib/Node'

import { SpriteLocalConfig, WidgetLocalConfig } from './quick-config/utils'

/** Get name which identifies the node, which may be a sprite or a widget */
export function getNodeId(target: Sprite | Widget | SpriteLocalConfig | WidgetLocalConfig) {
  const type = target instanceof Sprite || target instanceof SpriteLocalConfig ? 'sprite' : 'widget'
  return `${type}:${target.id}`
}

export function cancelBubble(e: KonvaEventObject<unknown>) {
  e.cancelBubble = true
}
