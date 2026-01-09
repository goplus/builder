import { debounce, escape, memoize } from 'lodash'
import dayjs from 'dayjs'
import {
  shallowReactive,
  shallowRef,
  watch,
  watchEffect,
  type ShallowRef,
  type WatchSource,
  computed,
  onUnmounted,
  onDeactivated,
  ref,
  onActivated,
  toValue,
  onScopeDispose
} from 'vue'
import { useI18n, type LocaleMessage } from './i18n'
import { getCleanupSignal, type Disposable, type OnCleanup } from './disposable'
import { capture } from './exception'

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
 * @deprecated Use `useAsyncComputed` instead if possible.
 * Like `useAsyncComputed`, but keep the previous value when re-evaluating.
 */
export function useAsyncComputedLegacy<T>(getter: (onCleanup: OnCleanup) => Promise<T>) {
  const r = shallowRef<T | null>(null)
  watchEffect(async (onCleanup) => {
    let cancelled = false
    onCleanup(() => {
      cancelled = true
    })
    const result = await getter(onCleanup)
    if (!cancelled) r.value = result
  })
  return r
}

/**
 * Like `useAsyncComputedLegacy`, but reset value to `null` when re-evaluating.
 * TODO: Migrate usages of `useAsyncComputedLegacy` to this if possible.
 */
export function useAsyncComputed<T>(getter: (onCleanup: OnCleanup) => Promise<T>) {
  const r = shallowRef<T | null>(null)
  watchEffect(async (onCleanup) => {
    let cancelled = false
    onCleanup(() => {
      cancelled = true
    })
    r.value = null
    const result = await getter(onCleanup)
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

/** Like `computed`, while dispose the value properly */
export function useComputedDisposable<T extends Disposable | null>(getter: () => T) {
  const r = shallowRef<T>()
  watchEffect((onCleanup) => {
    const value = getter()
    onCleanup(() => value?.dispose())
    r.value = value
  })
  return r as ShallowRef<T>
}

const lsSyncer = shallowReactive(new Map<string, number>())

function watchLSChange(key: string) {
  lsSyncer.get(key)
}

function fireLSChange(key: string) {
  const val = lsSyncer.get(key) ?? 0
  lsSyncer.set(key, val + 1)
}

/**
 * Get ref for reading / writing data in localStorage.
 * Changes will be synchronized within the same document.
 */
export function localStorageRef<T>(key: string, initialValue: T) {
  const ref = computed<T>({
    get() {
      watchLSChange(key)
      const storedValue = localStorage.getItem(key)
      if (storedValue == null) return initialValue
      return JSON.parse(storedValue)
    },
    set(newValue) {
      if (newValue === initialValue) {
        // Remove the key if the value is the initial value.
        // NOTE: this may be unexpected for some special use cases
        localStorage.removeItem(key)
      } else {
        localStorage.setItem(key, JSON.stringify(newValue))
      }
      fireLSChange(key)
    }
  })
  return ref
}

/**
 * Wait until given (reactive) value not null.
 * ```ts
 * const foo = await untilNotNull(fooRef)
 * const bar = await untilNotNull(() => getBar())
 * ```
 * NOTE: Give value will not be collected as dependency.
 */
export function untilNotNull<T>(valueSource: WatchSource<T | null | undefined>, signal?: AbortSignal) {
  return untilConditionMet(
    valueSource as WatchSource<T | null | undefined>,
    (value): value is NonNullable<T> => value != null,
    signal
  ) as Promise<NonNullable<T>>
}

/**
 * Wait until given condition is met.
 * NOTE: Give condition will not be collected as dependency.
 */
export async function until(conditionSource: WatchSource<boolean>, signal?: AbortSignal) {
  await untilConditionMet(conditionSource, (c) => c, signal)
}

/**
 * Wait until a given condition is met for a (reactive) value.
 * ```ts
 * const foo = await untilConditionMet(fooRef, (value) => value !== null)
 * const bar = await untilConditionMet(() => getBar(), (value) => value > 10)
 * ```
 * NOTE: Give value will not be collected as dependency.
 */
function untilConditionMet<T>(
  valueSource: WatchSource<T>,
  condition: (value: T) => boolean,
  signal?: AbortSignal
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
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
      const onAbort = () => {
        stopWatch?.()
        reject(signal.reason)
      }
      if (signal.aborted) onAbort()
      else signal.addEventListener('abort', onAbort)
    }
  })
}

/** Convert arbitrary degree value to `(-180, 180]` */
export function normalizeDegree(num: number) {
  if (!Number.isFinite(num) || Number.isNaN(num)) return num
  num = num % 360
  if (num > 180) num = num - 360
  if (num <= -180) num = num + 360
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

// TODO: we may move these `humanizeX` functions to i18n module as exposed helpers

/** Convert time string to human-friendly format, e.g., "3 days ago" */
export function humanizeTime(time: string): LocaleMessage {
  const t = dayjs(time)
  return {
    // TODO: maybe still too long for `ProjectItem`, especially for time like "a few seconds ago"
    en: t.locale('en').fromNow(),
    zh: t.locale('zh').fromNow()
  }
}

const spacingRight = /([\u4e00-\u9fa5\u3040-\u30ff\uff00-\uffef])([a-zA-Z0-9])/g
const spacingLeft = /([a-zA-Z0-9])([\u4e00-\u9fa5\u3040-\u30ff\uff00-\uffef])/g
/**
 * Add spaces between Chinese characters and numbers/English words.
 * For example, change `将在1 小时后` to `将在 1 小时后`, and `你好world` to `你好 world`.
 */
export function spacingTextZh(text: string): string {
  return text.replace(spacingRight, '$1 $2').replace(spacingLeft, '$1 $2')
}
export function spacingLocaleZhMessage(locale: LocaleMessage): LocaleMessage {
  return {
    en: locale.en,
    zh: spacingTextZh(locale.zh)
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

export function humanizeList(list: LocaleMessage[]) {
  return {
    en: list.map((i) => i.en).join(', '),
    zh: list.map((i) => i.zh).join('、')
  }
}

export function humanizeListWithLimit(list: LocaleMessage[], maxNum: number = 3) {
  if (list.length <= maxNum) return humanizeList(list)
  const limited = humanizeList(list.slice(0, maxNum))
  return {
    en: `${limited.en} and ${list.length - maxNum} more`,
    zh: `${limited.zh}等 ${list.length} 个`
  }
}

export function humanizeFileSize(
  /** File size in bytes */
  size: number
) {
  const base = 1024
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  for (let i = 0; i < units.length; i++) {
    if (size < base || i === units.length - 1) {
      const text = `${parseFloat(size.toFixed(2)) + ''} ${units[i]}`
      return { en: text, zh: text }
    }
    size /= base
  }
  throw new Error('Unreachable code in humanizeFileSize')
}

export function usePageTitle(
  titleParts: LocaleMessage | LocaleMessage[] | (() => LocaleMessage | LocaleMessage[] | null)
) {
  const i18n = useI18n()
  function setTitle(parts: LocaleMessage | LocaleMessage[]) {
    if (!Array.isArray(parts)) parts = [parts]
    document.title = [...parts.map((p) => i18n.t(p)), 'XBuilder'].join(' - ')
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

export function timeout(duration = 0, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => resolve(), duration)
    if (signal != null) {
      const onAbort = () => {
        clearTimeout(timer)
        reject(signal.reason)
      }
      if (signal.aborted) onAbort()
      else signal.addEventListener('abort', onAbort)
    }
  })
}

/**
 * If intervalWatch is null, it will clear the interval.
 */
export function useInterval(callback: () => void, intervalWatch: WatchSource<number | null>) {
  onScopeDispose(
    watch(
      intervalWatch,
      (interval, _, onCleanup) => {
        if (interval == null || interval <= 0) return
        const timer = setInterval(callback, interval)
        onCleanup(() => clearInterval(timer))
      },
      { immediate: true }
    )
  )
}

export function trimLineBreaks(str: string) {
  return str.replace(/^\n+|\n+$/g, '')
}

export function useActivated() {
  const activatedRef = ref(true)
  onActivated(() => (activatedRef.value = true))
  onDeactivated(() => (activatedRef.value = false))
  onUnmounted(() => (activatedRef.value = false))
  return activatedRef
}

export function escapeHTML(str: string) {
  return escape(str)
}

/**
 * Create a new value reference for given source with debounce.
 * Changes to the source will be reflected in the new value reference.
 * Changes to the new value reference will be reflected in the source with debounce.
 * The new value reference can be used as model (`v-model`) for input components.
 */
export function useDebouncedModel<T>(source: WatchSource<T>, onChange: (value: T) => void, wait = 300) {
  const valueRef = ref<T>(toValue(source))
  const debouncedOnChange = debounce(() => {
    if (valueRef.value === toValue(source)) return
    onChange(valueRef.value)
  }, wait)
  watch(source, (newSourceValue) => (valueRef.value = newSourceValue))
  watch(valueRef, debouncedOnChange)
  return [valueRef, () => debouncedOnChange.flush()] as const
}

export function upFirst(str: string) {
  const firstChar = unicodeSafeSlice(str, 0, 1)
  return firstChar.toUpperCase() + str.slice(firstChar.length)
}

export function lowFirst(str: string) {
  const firstChar = unicodeSafeSlice(str, 0, 1)
  return firstChar.toLowerCase() + str.slice(firstChar.length)
}

export function isCrossOriginUrl(url: string, origin = window.location.origin) {
  try {
    const parsedUrl = new URL(url)
    if (parsedUrl.protocol === 'data:') return false // Data URLs are not assumed cross-origin
    return parsedUrl.origin !== origin
  } catch {
    // If URL parsing fails (for example relative URL), assume it's not a cross-origin URL
    return false
  }
}

/**
 * Helper for using external URLs.
 * We enable cross-origin isolation for Builder by specifying COEP header,
 * which denies cross-origin requests by default. By fetching the URL (with CORS enabled),
 * then creating an object URL from the response, we can safely use cross-origin URLs in Builder.
 *
 * NOTE: You may not need this if you are consuming URL of a `File` (see details in `src/models/common/file.ts`).
 * `File.url` automatically create an object URL for further usage.
 */
export function useExternalUrl(urlSource: WatchSource<string | null | undefined>) {
  const urlRef = ref<string | null>(null)
  watch(
    urlSource,
    async (url, _, onCleanup) => {
      if (url == null) {
        urlRef.value = null
        return
      }
      if (!isCrossOriginUrl(url)) {
        urlRef.value = url
        return
      }
      const signal = getCleanupSignal(onCleanup)
      const resp = await fetch(url)
      signal.throwIfAborted()
      const ab = await resp.arrayBuffer()
      signal.throwIfAborted()
      const objectUrl = URL.createObjectURL(new Blob([ab], { type: resp.headers.get('Content-Type') ?? '' }))
      signal.addEventListener('abort', () => URL.revokeObjectURL(objectUrl))
      urlRef.value = objectUrl
    },
    { immediate: true }
  )
  return urlRef
}

export function createResettableObject<T extends object>(getter: () => T): [T, () => void] {
  const state = {
    ...getter()
  }
  return [
    state,
    () => {
      Object.assign(state, { ...getter() })
    }
  ]
}

/** Helper function for exhaustive checks of discriminated unions in TypeScript. */
export function assertNever(input: never): never {
  throw new Error(`Unreachable code reached with input: ${input}`)
}

/**
 * Safely slice a string by Unicode code points.
 * This prevents breaking surrogate pairs and combining characters.
 * Use this instead of `str.slice(start, end)` when these conditions are met:
 * - The string may include non-BMP characters (e.g., emojis), especially when it is provided by the user
 * - And you are not sure if slicing positions (start / end) are at valid code point boundaries, especially when they are fixed numbers
 */
export function unicodeSafeSlice(input: string, start: number, end: number = input.length) {
  // Safety limit: Some Unicode code points (e.g., emojis) can be represented by up to two UTF-16 code units.
  // To avoid creating excessively large arrays when slicing, we limit the input length to at most `end * MAX_CODE_UNIT_PER_CODE_POINT`.
  const MAX_CODE_UNIT_PER_CODE_POINT = 2
  input = input.slice(0, end * MAX_CODE_UNIT_PER_CODE_POINT)
  const codePoints = Array.from(input)
  return codePoints.slice(start, end).join('')
}

/** https://developer.mozilla.org/en-US/docs/Web/API/Prioritized_Task_Scheduling_API#task_priorities */
export function untilTaskScheduled(
  priority: 'user-blocking' | 'user-visible' | 'background' = 'user-visible',
  signal?: AbortSignal
) {
  const startAt = performance.now()
  return scheduler.postTask(
    () => {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.debug(`task yielded (${priority})`, performance.now() - startAt)
      }
    },
    { priority, signal }
  )
}

/**
 * Retry given async function upon failure.
 * The function will be retried up to `maxRetries` times (totally `maxRetries + 1` attempts),
 * with a delay of `delayMs` milliseconds between each attempt.
 */
export async function withRetry<T>(fn: () => Promise<T>, maxRetries: number = 3, delayMs: number = 1000): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt >= maxRetries) throw error
      capture(error, `Attempt ${attempt + 1} failed, retrying...`)
      await timeout(delayMs)
    }
  }
  throw new Error(`invalid maxRetries: ${maxRetries}`)
}
