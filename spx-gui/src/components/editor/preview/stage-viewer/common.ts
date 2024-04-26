import { inject, provide, reactive, type InjectionKey } from 'vue'

export const spritesReadyKey: InjectionKey<Map<string, boolean>> = Symbol('sprites-status')

export function useSpritesReady() {
  const s = inject(spritesReadyKey)
  if (s == null) throw new Error('TODO')
  return s
}

export function provideSpritesReady() {
  const spritesReady = reactive(new Map<string, boolean>())
  provide(spritesReadyKey, spritesReady)
}
