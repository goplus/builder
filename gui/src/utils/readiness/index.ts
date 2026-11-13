import {
  computed,
  inject,
  nextTick,
  onMounted,
  onScopeDispose,
  provide,
  ref,
  shallowReactive,
  toValue,
  type ComputedRef,
  type InjectionKey,
  type Ref,
  type WatchSource
} from 'vue'
import { until } from '../utils'

export { default as ReadinessProvider } from './ReadinessProvider.vue'

const stateKey = Symbol('readiness-state')
type ReadinessState = {
  mounted: Ref<boolean>
  sources: Set<WatchSource<boolean>>
}

export interface ReadinessScope {
  readonly ready: ComputedRef<boolean>
  /** Waits for reported prerequisites and their DOM updates; cancels with the caller's signal. */
  untilReady(signal?: AbortSignal): Promise<void>
  readonly [stateKey]: ReadinessState
}

const readinessKey: InjectionKey<ReadinessScope> = Symbol('readiness')

/** Creates a scope belonging to one provided component boundary. */
export function createReadinessScope(): ReadinessScope {
  const state: ReadinessState = {
    mounted: ref(false),
    sources: shallowReactive(new Set())
  }
  const ready = computed(() => state.mounted.value && ![...state.sources].some((source) => toValue(source)))
  return {
    ready,
    async untilReady(signal) {
      // Flush pending updates so descendants can mount and report newly pending work.
      await nextTick()
      do {
        await until(ready, signal)
        // Ready data still needs its DOM update committed; it may mount new async descendants.
        await nextTick()
        signal?.throwIfAborted()
      } while (!ready.value)
    },
    [stateKey]: state
  }
}

/** Provides a subtree boundary, registering its readiness with the nearest parent scope. */
export function useProvideReadiness(scope: ReadinessScope = createReadinessScope()) {
  useRegisterLoading(() => !scope.ready.value)
  provide(readinessKey, scope)
  onMounted(() => {
    scope[stateKey].mounted.value = true
  })
  onScopeDispose(() => {
    scope[stateKey].mounted.value = false
  })
  return scope
}

/** Reports pending work to the nearest ancestor boundary; unregisters when this component's scope ends. */
export function useRegisterLoading(source: WatchSource<boolean>) {
  const scope = inject(readinessKey, null)
  if (scope == null) return
  scope[stateKey].sources.add(source)
  onScopeDispose(() => scope[stateKey].sources.delete(source))
}
