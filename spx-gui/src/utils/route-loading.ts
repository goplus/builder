/**
 * Centralized route-loading state.
 * Routes report their post-navigation loading status here,
 * providing a single source of truth for whether the active route is loaded.
 */

import {
  computed,
  onScopeDispose,
  type InjectionKey,
  type WatchSource,
  type Ref,
  watch,
  nextTick,
  shallowReactive,
  type ShallowReactive
} from 'vue'
import { useAppProvide, useAppInject } from './app-state'

type LoadingCtx = {
  loadedSources: ShallowReactive<Map<WatchSource<boolean>, boolean>>
}

const loadingCtxKey: InjectionKey<LoadingCtx> = Symbol('loading-ctx')

/**
 * Install route-loading.
 * TODO: Install directly with app?
 */
export function useInstallRouteLoading() {
  const loadedSources = shallowReactive<Map<WatchSource<boolean>, boolean>>(new Map())
  useAppProvide(loadingCtxKey, { loadedSources })
}

export function useLoadedSources(): ShallowReactive<Map<WatchSource<boolean>, boolean>> {
  const ctx = useAppInject(loadingCtxKey)
  if (ctx.value == null) throw new Error('useLoadedSources must be used after useInstallRouteLoading')
  return ctx.value.loadedSources
}

/** Get the current route loading state. */
export function useIsRouteLoaded(): Ref<boolean> {
  const loadedSources = useLoadedSources()
  return computed(() => {
    const loaded = [...loadedSources.values()].every(Boolean)
    return loaded
  })
}

export function useRegisterUpdateRouteLoaded(loadedSource: WatchSource<boolean>) {
  const loadedSources = useLoadedSources()

  watch(
    loadedSource,
    (loaded) => {
      // Only handle the loaded=true state
      // using nextTick to defer the state update and allow child components to construct/render first
      if (loaded) {
        nextTick(() => loadedSources.set(loadedSource, loaded))
      } else {
        loadedSources.set(loadedSource, loaded)
      }
    },
    {
      immediate: true
    }
  )

  onScopeDispose(() => loadedSources.delete(loadedSource))
}
