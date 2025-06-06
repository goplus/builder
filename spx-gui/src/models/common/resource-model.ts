import type { LocaleMessage } from '@/utils/i18n'
import type { Stage } from '../stage'
import type { Sprite } from '../sprite'
import type { Sound } from '../sound'
import type { Backdrop } from '../backdrop'
import type { Widget } from '../widget'
import type { Animation } from '../animation'
import type { Costume } from '../costume'

export type ResourceModel = Stage | Sound | Sprite | Backdrop | Widget | Animation | Costume

export type ResourceModelType = 'stage' | 'sound' | 'sprite' | 'backdrop' | 'widget' | 'animation' | 'costume'

function isResourceModelType(type: string): type is ResourceModelType {
  return ['stage', 'sound', 'sprite', 'backdrop', 'widget', 'animation', 'costume'].includes(type)
}

export class ResourceModelIdentifier {
  constructor(
    public readonly type: ResourceModelType,
    public readonly id: string | null = null
  ) {}

  static parse(str: string): ResourceModelIdentifier {
    const [type, id] = str.split(':')
    if (!isResourceModelType(type)) throw new Error(`Invalid resource type: ${type}`)
    return new ResourceModelIdentifier(type as ResourceModelType, id || null)
  }

  toString() {
    return `${this.type}:${this.id ?? ''}`
  }
}

export function humanizeResourceType(type: ResourceModelType): LocaleMessage {
  switch (type) {
    case 'stage':
      return { en: 'stage', zh: '舞台' }
    case 'sound':
      return { en: 'sound', zh: '声音' }
    case 'sprite':
      return { en: 'sprite', zh: '精灵' }
    case 'backdrop':
      return { en: 'backdrop', zh: '背景' }
    case 'widget':
      return { en: 'widget', zh: '控件' }
    case 'animation':
      return { en: 'animation', zh: '动画' }
    case 'costume':
      return { en: 'costume', zh: '造型' }
    default:
      throw new Error(`Invalid resource type: ${type}`)
  }
}
