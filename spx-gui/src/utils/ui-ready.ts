import {
  computed,
  inject,
  onScopeDispose,
  provide,
  shallowReactive,
  watch,
  type InjectionKey,
  type WatchSource
} from 'vue'

const uiReadyKey: InjectionKey<Map<WatchSource<boolean>, boolean>> = Symbol('ui-ready')

/** Collects readiness of async UI descendants within this component tree. */
export function useProvideUIReady() {
  const sources = shallowReactive(new Map<WatchSource<boolean>, boolean>())
  provide(uiReadyKey, sources)
  return computed(() => [...sources.values()].every(Boolean))
}

/** Reports readiness to the nearest UI readiness boundary, when present. */
export function useRegisterUIReady(source: WatchSource<boolean>) {
  const sources = inject(uiReadyKey, null)
  if (sources == null) return
  watch(source, (ready) => sources.set(source, ready), { immediate: true, flush: 'sync' })
  onScopeDispose(() => sources.delete(source))
}
