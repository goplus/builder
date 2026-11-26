import { inject, provide, reactive, type InjectionKey } from 'vue'

export type CanvasView = {
  width: number
  height: number
}

const canvasViewsKey: InjectionKey<Map<string, CanvasView>> = Symbol('resource-canvas')

export function provideResourceCanvas() {
  provide(canvasViewsKey, new Map())
}

export function useResourceCanvas() {
  return inject(canvasViewsKey, null)
}

export function getCanvasView(views: Map<string, CanvasView>, key: string) {
  let view = views.get(key)
  if (view == null) {
    view = reactive({ width: 0, height: 0 })
    views.set(key, view)
  }
  return view
}
