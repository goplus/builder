import type { Type as IconType } from '@/components/ui/icons/UIIcon.vue'
import type { MobileKeyboardZoneToKeyMapping } from '@/apis/project'
export type KeyboardEventType = 'keydown' | 'keyup'
/** Corresponding value of `KeyboardEvent.key`, see details in https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values */
export type WebKeyValue = string
export const zones = ['lt', 'rt', 'lb', 'rb'] as const
export type ZoneId = (typeof zones)[number]
export type SystemKeyType = {
  textEn?: string
  textZh?: string
  icon?: IconType
  action: string
}
export const systemKeys: SystemKeyType[] = [
  {
    textEn: 'Rerun',
    textZh: '重新运行',
    icon: 'rotate' as IconType,
    action: 'rerun'
  },
  {
    textEn: 'Close',
    textZh: '关闭',
    icon: 'close' as IconType,
    action: 'close'
  }
]
type KeyStyle = {
  left?: string
  right?: string
  top?: string
  bottom?: string
  transform: string
}
export function getKeyStyle(zone: ZoneId, posx: number, posy: number): KeyStyle {
  switch (zone) {
    case 'lt':
      return { left: `${posx}px`, top: `${posy}px`, transform: 'translate(-50%, -50%)' }
    case 'rt':
      return { right: `${posx}px`, top: `${posy}px`, transform: 'translate(50%, -50%)' }
    case 'lb':
      return { left: `${posx}px`, bottom: `${posy}px`, transform: 'translate(-50%, 50%)' }
    case 'rb':
      return { right: `${posx}px`, bottom: `${posy}px`, transform: 'translate(50%, 50%)' }
  }
}
export const EMPTY_ZONE_MAPPING: MobileKeyboardZoneToKeyMapping = {
  lt: null,
  rt: null,
  lb: null,
  rb: null
} as const
