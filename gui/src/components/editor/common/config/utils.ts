import { debounce } from 'lodash'

import { type Sprite } from '@/models/spx/sprite'
import type { History } from '@/components/editor/history'

export function wrapUpdateHandler<Args extends any[]>(
  handler: (...args: Args) => unknown,
  provideSpriteContext: () => { sprite: Sprite; history: History },
  withDebounce = true
): (...args: Args) => void {
  const { sprite, history } = provideSpriteContext()
  const sname = sprite.name
  const action = { name: { en: `Configure sprite ${sname}`, zh: `修改精灵 ${sname} 配置` } }
  const wrapped = (...args: Args) => history.doAction(action, () => handler(...args))
  return withDebounce ? debounce(wrapped, 300) : wrapped
}
