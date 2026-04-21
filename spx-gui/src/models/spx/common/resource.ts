import type { LocaleMessage } from '@/utils/i18n'
import type { Stage } from '../stage'
import type { Sprite } from '../sprite'
import type { Sound } from '../sound'
import type { Backdrop } from '../backdrop'
import type { Widget } from '../widget'
import type { Animation } from '../animation'
import type { Costume } from '../costume'

export type ResourceModel = Stage | Sound | Sprite | Backdrop | Widget | Animation | Costume

export type ResourceType = 'stage' | 'sound' | 'sprite' | 'backdrop' | 'widget' | 'animation' | 'costume'

export const resourceStageName = { en: 'stage', zh: '舞台' }
export const resourceSoundName = { en: 'sound', zh: '声音' }
export const resourceSpriteName = { en: 'sprite', zh: '精灵' }
export const resourceBackdropName = { en: 'backdrop', zh: '背景' }
export const resourceWidgetName = { en: 'widget', zh: '控件' }
export const resourceAnimationName = { en: 'animation', zh: '动画' }
export const resourceCostumeName = { en: 'costume', zh: '造型' }

export function humanizeResourceType(type: ResourceType): LocaleMessage {
  switch (type) {
    case 'stage':
      return resourceStageName
    case 'sound':
      return resourceSoundName
    case 'sprite':
      return resourceSpriteName
    case 'backdrop':
      return resourceBackdropName
    case 'widget':
      return resourceWidgetName
    case 'animation':
      return resourceAnimationName
    case 'costume':
      return resourceCostumeName
    default:
      throw new Error(`Invalid resource type: ${type}`)
  }
}
