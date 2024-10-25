import { computed } from 'vue'
import { useRouter, type Router } from 'vue-router'

type KVS = Partial<Record<string, string | null>>

export function getStringParam(router: Router, key: string): string | null {
  const value = router.currentRoute.value.query[key]
  if (value == null) return null
  if (Array.isArray(value)) return value[0]
  return value
}

function setParams(router: Router, kvs: KVS, modifier?: (kvs: KVS) => KVS) {
  if (modifier != null) kvs = modifier(kvs)
  const newQuery = { ...router.currentRoute.value.query, ...kvs }
  Object.keys(newQuery).forEach((k) => {
    // remove fields with null value
    if (newQuery[k] == null) delete newQuery[k]
  })
  router.push({ query: newQuery })
}

export function useRouteQueryParamInt(
  key: string,
  defaultValue: number,
  // TODO: `setModifier` looks complicated. Maybe we can make the API simpler.
  setModifier?: (kvs: KVS) => KVS
) {
  const router = useRouter()
  return computed<number>({
    get() {
      const numStr = getStringParam(router, key)
      if (numStr == null || numStr === '') return defaultValue
      const num = parseInt(numStr, 10)
      return Number.isNaN(num) ? defaultValue : num
    },
    set(v) {
      const kvs = { [key]: v === defaultValue ? null : v.toString() }
      setParams(router, kvs, setModifier)
    }
  })
}

export function useRouteQueryParamStr<K extends string>(
  key: K,
  defaultValue: string,
  setModifier?: (kvs: KVS) => KVS
) {
  const router = useRouter()
  return computed<string>({
    get() {
      const value = getStringParam(router, key)
      return value == null || value === '' ? defaultValue : value
    },
    set(v) {
      const kvs = { [key]: v === defaultValue ? null : v }
      setParams(router, kvs, setModifier)
    }
  })
}

type StrEnumType<E> = Record<keyof E, string>

export function useRouteQueryParamStrEnum<K extends string, E extends StrEnumType<E>>(
  key: K,
  e: E,
  defaultValue: E[keyof E],
  setModifier?: (kvs: KVS) => KVS
) {
  const router = useRouter()
  return computed<E[keyof E]>({
    get() {
      const valueStr = getStringParam(router, key)
      if (valueStr == null || valueStr === '') return defaultValue
      if (!Object.values(e).includes(valueStr)) return defaultValue
      return valueStr as E[keyof E]
    },
    set(v) {
      const kvs = { [key]: v === defaultValue ? null : v }
      setParams(router, kvs, setModifier)
    }
  })
}
