/**
 * @desc Helpers for testing
 */

import { createApp, type Plugin } from 'vue'
import { VueQueryPlugin, type QueryClient } from '@tanstack/vue-query'
import { File } from '@/models/common/file'

export function sleep(duration = 1000) {
  return new Promise<void>((resolve) => setTimeout(() => resolve(), duration))
}

export function delayFile(file: File, duration = 1000) {
  return new File(file!.name, () => sleep(duration).then(() => file!.arrayBuffer()), {
    type: file!.type
  })
}

/**
 * Helper for testing composable functions that rely on a host component instance.
 * For more information, check https://vuejs.org/guide/scaling-up/testing#testing-composables.
 */
export function withSetup<R>(composable: () => R, plugins: Array<[Plugin, ...unknown[]]> = []) {
  let result: R
  const app = createApp({
    setup() {
      result = composable()
      return () => {}
    }
  })
  for (const [plugin, ...options] of plugins) app.use(plugin, ...options)
  app.mount(document.createElement('div'))
  return result!
}

/** `withSetup` for composables that use the `vue-query` cache, with `queryClient` as that cache. */
export function withQueryClient<R>(queryClient: QueryClient, composable: () => R) {
  return withSetup(composable, [[VueQueryPlugin, { queryClient }]])
}
