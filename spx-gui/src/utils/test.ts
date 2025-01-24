/**
 * @desc Helpers for testing
 */

import { createApp } from 'vue'
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
export function withSetup<R>(composable: () => R) {
  let result: R
  createApp({
    setup() {
      result = composable()
      return () => {}
    }
  }).mount(document.createElement('div'))
  return result!
}
