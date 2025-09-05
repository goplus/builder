/**
 * @desc App-level state sharing utilities.
 */

import { computed, inject, onBeforeUnmount, shallowReactive, type App, type InjectionKey } from 'vue'

const stateKey: InjectionKey<Map<InjectionKey<unknown>, unknown>> = Symbol('app-state')

export function createAppState() {
  return {
    install(app: App) {
      app.provide(stateKey, shallowReactive(new Map()))
    }
  }
}

export function useAppProvide<T>(key: InjectionKey<T>, value: T) {
  const map = inject(stateKey)
  if (map == null) throw new Error('useAppProvide must be called after install')
  map.set(key, value)
  onBeforeUnmount(() => {
    map.delete(key)
  })
}

export function useAppInject<T>(key: InjectionKey<T>) {
  const map = inject(stateKey)
  if (map == null) throw new Error('useAppInject must be called after install')
  return computed(() => map.get(key) as T | undefined)
}
