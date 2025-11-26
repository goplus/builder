/**
 * Centralized route-loading state.
 * Routes report their post-navigation loading status here,
 * providing a single source of truth for whether the active route is loaded.
 */

import {
  computed,
  onMounted,
  onScopeDispose,
  ref,
  shallowRef,
  toValue,
  triggerRef,
  type InjectionKey,
  type ShallowRef,
  type WatchSource,
  type Ref
} from 'vue'
import { useRouter } from 'vue-router'
import { useAppProvide, useAppInject } from './app-state'
import { until } from './utils'

type LoadingCtx = {
  loadingSources: ShallowRef<Array<WatchSource<boolean>>>
}

const loadingCtxKey: InjectionKey<LoadingCtx> = Symbol('loading-ctx')

/**
 * Install route-loading.
 * TODO: Install directly with app?
 */
export function useInstallRouteLoading() {
  const loadingSources = shallowRef<Array<WatchSource<boolean>>>([])
  useAppProvide(loadingCtxKey, { loadingSources })
  const router = useRouter()
  onScopeDispose(
    router.beforeEach((to, from) => {
      const fromLast = from.matched.at(-1)
      const toLast = to.matched.at(-1)
      const loadingWatchSources = []
      if (fromLast != null && toLast != null && fromLast.components != null && toLast.components != null) {
        // For cases like the editor, internal navigation doesn't rebuild components, so we need to preserve WatchSources that are still loading
        // For example, when entering the editor, it navigates from /editor/owner/projectName/ to /editor/owner/projectName/sprites/name/code
        if (Object.keys(toLast.components).every((key) => fromLast.components?.[key] === toLast.components?.[key])) {
          loadingWatchSources.push(...loadingSources.value.filter((source) => !toValue(source)))
        }
      }
      loadingSources.value = [...loadingWatchSources]
    })
  )
}

export function useLoadingSources(): ShallowRef<Array<WatchSource<boolean>>> {
  const ctx = useAppInject(loadingCtxKey)
  if (ctx.value == null) throw new Error('useLoadingSources must be used after useInstallRouteLoading')
  return ctx.value.loadingSources
}

/** Get the current route loading state. */
export function useIsRouteLoaded(): Ref<boolean> {
  const loadingSources = useLoadingSources()
  return computed(() => {
    const loaded = loadingSources.value.every(toValue)
    return loaded
  })
}

export function useRegisterRouteLoading(isLoadedSource: WatchSource<boolean>) {
  const loadingSources = useLoadingSources()
  loadingSources.value.push(isLoadedSource)

  // When there's no loadedSource, we assume the page is still initializing, introduce special handling to ensure the page is rendered as much as possible
  if (loadingSources.value.length === 1) {
    const waitLoadedSource = ref(false)
    onMounted(async () => {
      await until(isLoadedSource)
      waitLoadedSource.value = true
    })
    loadingSources.value.push(waitLoadedSource)
  }

  triggerRef(loadingSources)
}
