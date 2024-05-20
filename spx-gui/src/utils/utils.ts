import { ref, shallowReactive, watch, watchEffect } from 'vue'

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

export function debounce<T extends (...args: any[]) => any>(func: T, delay: number = 300) {
  let timeoutId: ReturnType<typeof setTimeout>
  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    const context = this
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      func.apply(context, args)
    }, delay)
  }
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
  const r = ref<T>()
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
