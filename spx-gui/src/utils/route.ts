import { useRouter, type LocationQuery } from 'vue-router'

function getStringParam(query: LocationQuery, key: string): string | null {
  const value = query[key]
  if (value == null) return null
  if (Array.isArray(value)) return value[0]
  return value
}

/**
 * Simplify manipulation for query parameters of current route.
 * ```ts
 * const query = useRouteQuery<'foo' | 'bar'>()
 * const foo = query.get('foo')
 * query.set('foo', '123')
 * query.set({ foo: '123', bar: null })
 * ```
 */
export function useRouteQuery<K extends string = string>() {
  const router = useRouter()

  function get(key: K) {
    return getStringParam(router.currentRoute.value.query, key)
  }

  function set(key: K, value: string | null): void
  function set(kvs: Partial<Record<K, string | null>>): void
  function set(keyOrKvs: Partial<Record<K, string | null>> | string, value?: string | null) {
    const kvs = typeof keyOrKvs === 'string' ? { [keyOrKvs]: value } : keyOrKvs
    const newQuery = { ...router.currentRoute.value.query, ...kvs }
    Object.keys(newQuery).forEach((k) => {
      // remove fields with null value
      if (newQuery[k] == null) delete newQuery[k]
    })
    router.push({ query: newQuery })
  }

  return { get, set }
}
