/**
 * Centralized route-loading state.
 * Routes report their post-navigation loading status here,
 * providing a single source of truth for whether the active route is loaded.
 */

import { onScopeDispose, ref, watch, type InjectionKey, type Ref, type WatchSource } from 'vue'
import { useRouter } from 'vue-router'
import { useAppProvide, useAppInject } from './app-state'

type LoadingCtx = {
  isLoadedRef: Ref<boolean>
}

const loadingCtxKey: InjectionKey<LoadingCtx> = Symbol('loading-ctx')

/**
 * Install route-loading.
 * TODO: Install directly with app?
 */
export function useInstallRouteLoading() {
  const isLoadedRef = ref(true)
  useAppProvide(loadingCtxKey, { isLoadedRef })
  const router = useRouter()
  onScopeDispose(
    router.beforeEach(() => {
      // By default, all routes are considered loaded.
      // Only those that explicitly set isLoaded may be considered unloaded.
      isLoadedRef.value = true
    })
  )
}

/** Get the current route loading state. */
export function useIsRouteLoaded(): Ref<boolean> {
  const ctx = useAppInject(loadingCtxKey)
  if (ctx.value == null) throw new Error('useIsRouteLoaded must be used after useInstallRouteLoading')
  return ctx.value.isLoadedRef
}

/** Update the route loading state. */
export function useUpdateRouteLoaded(isLoadedSource: WatchSource<boolean>) {
  const isLoadedRef = useIsRouteLoaded()
  onScopeDispose(
    watch(
      isLoadedSource,
      (isLoaded) => {
        isLoadedRef.value = isLoaded
      },
      { immediate: true }
    )
  )
}
