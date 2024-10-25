import { memoize } from 'lodash'
import dayjs from 'dayjs'
import { ref, shallowReactive, shallowRef, watch, watchEffect, type WatchSource } from 'vue'
import { useI18n, type LocaleMessage } from './i18n'

export const isImage = (url: string): boolean => {
  const extension = url.split('.').pop()
  if (!extension) return false
  return ['svg', 'jpeg', 'jpg', 'png'].includes(extension)
}

export const isSound = (url: string): boolean => {
  const extension = url.split('.').pop()
  if (!extension) return false
  return ['wav', 'mp3', 'ogg'].includes(extension)
}

/**
 * If add-to-public-library features are enabled.
 * In release v1.3, we do not allow users to add asset to public library (the corresponding features are disabled).
 * These features are only enabled when there is `?library` in URL query. A simple & ugly interface will be provided.
 * This is a informal & temporary behavior.
 */
export function isAddPublicLibraryEnabled() {
  return window.location.search.includes('?library')
}

export function useAsyncComputed<T>(getter: () => Promise<T>) {
  const r = shallowRef<T | null>(null)
  watchEffect(async (onCleanup) => {
    let cancelled = false
    onCleanup(() => {
      cancelled = true
    })
    const result = await getter()
    if (!cancelled) r.value = result
  })
  return r
}

/** Do math round with given decimal places */
export function round(num: number, decimalPlaceNum = 0) {
  const factor = 10 ** decimalPlaceNum
  return Math.round(num * factor) / factor
}

/** Construct a (shallow-)reactive object based on given value-getter, which tracks changes of source */
export function computedShallowReactive<T extends object>(getter: () => T) {
  const r = shallowReactive({}) as T
  watch(
    getter,
    (value) => {
      const keys = Object.keys(value) as (keyof T)[]
      for (const key of keys) {
        r[key] = value[key]
      }
    },
    { immediate: true }
  )
  return r
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const ref = shallowRef<T>(initialValue)
  const storedValue = localStorage.getItem(key)
  if (storedValue != null) {
    ref.value = JSON.parse(storedValue)
  }
  watch(ref, (newValue) => {
    if (newValue === initialValue) {
      // Remove the key if the value is the initial value.
      // NOTE: this may be unexpected for some special use cases
      localStorage.removeItem(key)
      return
    }
    localStorage.setItem(key, JSON.stringify(newValue))
  })
  return ref
}

/**
 * Wait until given (reactive) value not null.
 * ```ts
 * const foo = await untilNotNull(fooRef)
 * const bar = await untilNotNull(() => getBar())
 * ```
 */
export function untilNotNull<T>(
  valueSource: WatchSource<T | null | undefined>,
  signal?: AbortSignal
) {
  return untilConditionMet(
    valueSource as WatchSource<T | null | undefined>,
    (value): value is NonNullable<T> => value != null,
    signal
  ) as Promise<NonNullable<T>>
}

/** Wait until given condition is met. */
export async function until(conditionSource: WatchSource<boolean>, signal?: AbortSignal) {
  await untilConditionMet(conditionSource, (c) => c, signal)
}

/**
 * Wait until a given condition is met for a (reactive) value.
 * ```ts
 * const foo = await untilConditionMet(fooRef, (value) => value !== null)
 * const bar = await untilConditionMet(() => getBar(), (value) => value > 10)
 * ```
 */
function untilConditionMet<T>(
  valueSource: WatchSource<T>,
  condition: (value: T) => boolean,
  signal?: AbortSignal
): Promise<T> {
  return new Promise<T>((resolve) => {
    let stopWatch: (() => void) | null = null
    stopWatch = watch(
      valueSource,
      (value) => {
        if (!condition(value)) return
        resolve(value)
        stopWatch?.()
      },
      { immediate: true }
    )
    if (signal != null) {
      if (signal.aborted) stopWatch?.()
      else signal.addEventListener('abort', () => stopWatch?.())
    }
  })
}

/** Convert arbitrary degree value to `[-180, 180)` */
export function nomalizeDegree(num: number) {
  if (!Number.isFinite(num) || Number.isNaN(num)) return num
  num = num % 360
  if (num >= 180) num = num - 360
  if (num < -180) num = num + 360
  if (num === 0) num = 0 // convert `-0` to `0`
  return num
}

/** Memoize for async function. Rejected result will not be memoized. */
export function memoizeAsync<T extends (...args: any) => Promise<unknown>>(
  fn: T,
  resolver?: (...args: Parameters<T>) => unknown
): T {
  const fnWithCache = memoize(fn, resolver)
  return (async (...args: any) => {
    try {
      const result = await fnWithCache(...args)
      return result
    } catch (e) {
      fnWithCache.cache.delete(resolver?.(...args) ?? args[0])
      throw e
    }
  }) as T
}

/** Convert time string to human-friendly format, e.g., "3 days ago" */
export function humanizeTime(time: string): LocaleMessage {
  const t = dayjs(time)
  return {
    // TODO: maybe still too long for `ProjectItem`, especially for time like "a few seconds ago"
    en: t.locale('en').fromNow(),
    zh: t.locale('zh').fromNow()
  }
}

/** Humanize exact time, e.g., "September 29, 2024 5:58 PM" */
export function humanizeExactTime(time: string): LocaleMessage {
  const t = dayjs(time)
  return {
    en: t.locale('en').format('LLL'),
    zh: t.locale('zh').format('LLL')
  }
}

function humanizeCountEn(count: number) {
  if (count < 1000) return count.toString()
  if (count < 10000) return (count / 1000).toFixed(1) + 'k'
  return Math.round(count / 1000) + 'k'
}

function humanizeCountZh(count: number) {
  if (count < 10000) return count.toString()
  if (count < 100000) return (count / 10000).toFixed(1) + ' 万'
  return Math.round(count / 10000) + '万'
}

/** Convert count to human-friendly format, e.g., "1.2k" */
export function humanizeCount(count: number) {
  return {
    en: humanizeCountEn(count),
    zh: humanizeCountZh(count)
  }
}

/** Humanize exact count, e.g., "1,234" */
export function humanizeExactCount(count: number) {
  return {
    en: count.toLocaleString('en-US'),
    zh: count.toLocaleString('zh-CN')
  }
}

export function useFnWithLoading<Args extends any[], T>(fn: (...args: Args) => Promise<T>) {
  const isLoading = ref(false)
  async function wrappedFn(...args: Args) {
    isLoading.value = true
    try {
      return await fn(...args)
    } finally {
      isLoading.value = false
    }
  }
  return { fn: wrappedFn, isLoading }
}

export function usePageTitle(
  titleParts: LocaleMessage | LocaleMessage[] | (() => LocaleMessage | LocaleMessage[] | null)
) {
  const i18n = useI18n()
  function setTitle(parts: LocaleMessage | LocaleMessage[]) {
    if (!Array.isArray(parts)) parts = [parts]
    document.title = [...parts.map((p) => i18n.t(p)), 'Go+ Builder'].join(' - ')
  }

  if (typeof titleParts !== 'function') {
    setTitle(titleParts)
    return
  }

  watch(
    titleParts,
    (parts) => {
      if (parts == null) return
      setTitle(parts)
    },
    { immediate: true }
  )
}
