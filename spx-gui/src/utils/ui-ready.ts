import {
  computed,
  inject,
  onScopeDispose,
  provide,
  shallowReactive,
  toValue,
  type InjectionKey,
  type WatchSource
} from 'vue'

const uiReadyKey: InjectionKey<Set<WatchSource<boolean>>> = Symbol('ui-ready')

/** Collects readiness of async UI descendants within this component tree. */
export function useProvideUIReady() {
  const sources = shallowReactive(new Set<WatchSource<boolean>>())
  provide(uiReadyKey, sources)
  return computed(() => [...sources].every((source) => toValue(source)))
}

/** Reports readiness to the nearest UI readiness boundary, when present. */
export function useRegisterUIReady(source: WatchSource<boolean>) {
  const sources = inject(uiReadyKey, null)
  if (sources == null) return
  sources.add(source)
  onScopeDispose(() => sources.delete(source))
}
