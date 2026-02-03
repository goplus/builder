import { ref, toValue, watch, type WatchSource } from 'vue'
import { debounce } from 'lodash'
import type { Sprite } from '@/models/sprite'
import type { Project } from '@/models/project'
import type { Widget } from '@/models/widget'

export function useConfigModal<T>(source: WatchSource<T>, updator: (newValue: T) => void) {
  const value = ref<T>(toValue(source))
  watch(source, (newValue) => (value.value = newValue))
  return [value, updator] as const
}

export function wrapperSpriteUpdateHandler<T>(
  updator: (sprite: Sprite, newValue: T) => void,
  provideSpriteContext: () => { sprite: Sprite | null; project: Project },
  withDebounce = true
) {
  function fn(sprite: Sprite, newValue: T) {
    const name = sprite.name
    const action = { name: { en: `Configure sprite ${name}`, zh: `修改精灵 ${name} 配置` } }
    provideSpriteContext().project.history.doAction(action, () => updator(sprite, newValue))
  }
  const wrapped = withDebounce ? debounce(fn, 300) : fn
  return (newValue: T) => {
    const sprite = provideSpriteContext().sprite
    if (sprite == null) return
    wrapped(sprite, newValue)
  }
}

export function wrapperWidgetUpdateHandler<T>(
  updator: (widget: Widget, newValue: T) => void,
  provideWidgetContext: () => { widget: Widget | null; project: Project },
  withDebounce = true
) {
  function fn(widget: Widget, newValue: T) {
    const name = widget.name
    const action = { name: { en: `Configure widget ${name}`, zh: `修改控件 ${name} 配置` } }
    provideWidgetContext().project.history.doAction(action, () => updator(widget, newValue))
  }
  const wrapped = withDebounce ? debounce(fn, 300) : fn
  return (newValue: T) => {
    const widget = provideWidgetContext().widget
    if (widget == null) return
    wrapped(widget, newValue)
  }
}
