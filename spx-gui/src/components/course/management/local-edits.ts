import { shallowRef, toValue, watch, type ShallowRef, type WatchSource } from 'vue'

import { ConcurrencyLimitController } from '@/utils/concurrency-limit'

/**
 * A value edited ahead of the server. An edit shows at once, and its write, carrying the whole value as edited, runs
 * after the writes before it in `writes`, so that an earlier one never lands after a later one; values written to the
 * same record share it. While writes are pending, what `source` has is older than the edits shown, so the value
 * follows `source` again only once none is: it then takes what the last write returned, if anything, or `source` as
 * it is after a failure.
 */
export function useLocalEdits<T>(source: WatchSource<T>, writes = new ConcurrencyLimitController(1)) {
  const value = shallowRef(toValue(source)) as ShallowRef<T>
  let pending = 0
  watch(source, (current) => {
    if (pending === 0) value.value = current
  })

  async function edit(edited: T, write: (edited: T) => Promise<T | void>) {
    value.value = edited
    pending++
    let settled: { value: T } | null = null
    try {
      const written = await writes.run(() => write(edited))
      if (written !== undefined) settled = { value: written }
    } catch (e) {
      settled = { value: toValue(source) }
      throw e
    } finally {
      pending--
      if (pending === 0 && settled != null) value.value = settled.value
    }
  }

  return { value, edit }
}
