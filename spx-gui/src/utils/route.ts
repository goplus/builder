import { computed, type Ref } from 'vue'
import { useRouter, type Router } from 'vue-router'

type KVS = Partial<Record<string, string | null>>

export function getStringParam(router: Router, key: string): string | null {
  let value = router.currentRoute.value.query[key]
  if (Array.isArray(value)) value = value[0]

  /**
   * vue-router gives
   * `{ isNull: null, isEmpty: '', other: 'other' }`.
   * for
   * `?isNull&isEmpty=&other=other`
   */
  if (value === undefined) return null
  if (value === null) return ''
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

export function useRouteQueryParamStr<K extends string>(key: K, defaultValue: string, setModifier?: (kvs: KVS) => KVS) {
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

/** Matched route segments (URL-decoded). */
export type PathSegments = string[]

/** Convert a path string to path segments. */
export function path2PathSegments(path: string): PathSegments {
  return path.split('/').filter((segment) => segment !== '')
}

export function pathSegments2Path(segments: PathSegments): string {
  return segments.join('/')
}

/** Normalize a repeatable route param without splitting decoded segments. */
export function repeatableParamToPathSegments(param: string | string[]): PathSegments {
  return Array.isArray(param) ? param : param === '' ? [] : [param]
}

/** Shift the first segment off the path segments. */
export function shiftPath(path: PathSegments): [segment: string | null, extra: PathSegments] {
  const [first, ...rest] = path
  return [first ?? null, rest]
}

export type ScopedPushOptions = {
  /** Whether to replace the current route instead of pushing a new one. Defaults to false. */
  replace?: boolean
}

/** A router that is scoped to a path prefix. */
export interface IScopedRouter {
  /** The current path segments in scope. */
  currentPath: Ref<PathSegments>
  /** Navigate to a new path in scope. */
  push(newPath: PathSegments, options?: ScopedPushOptions): Promise<unknown>
}

/** Create a scoped router that reads and writes a repeatable route path param. */
function makeScopedRouterWithPathParam(
  router: Router,
  pathParamName: string,
  pathParamGetter?: () => string | string[]
): IScopedRouter {
  const paramGetter = pathParamGetter ?? (() => router.currentRoute.value.params[pathParamName])
  const currentPath = computed(() => repeatableParamToPathSegments(paramGetter()))
  return {
    currentPath,
    push: (newPath, options) => {
      const currentRoute = router.currentRoute.value

      // Vue Router currently calculates the scroll position on every router.push navigation,
      // which triggers layout recalculations that can negatively impact performance.
      // See details in https://github.com/vuejs/router/issues/2393.
      // TODO: We need to monitor the issue and update Vue Router when it is fixed.

      // Vue Router checks if we are already on the same route, and prevents redundant navigation.
      // So we do not need to check it manually to avoid infinite loops.
      return router.push({
        params: {
          ...currentRoute.params,
          [pathParamName]: newPath
        },
        query: currentRoute.query,
        hash: currentRoute.hash,
        replace: options?.replace
      })
    }
  }
}

/** Create a child scoped router that is scoped to a path prefix. */
export function makeChildScopedRouter(router: IScopedRouter, prefix: PathSegments): IScopedRouter {
  return {
    currentPath: computed(() => {
      const current = router.currentPath.value
      if (current.length < prefix.length) return []
      for (let i = 0; i < prefix.length; i++) {
        if (current[i] !== prefix[i]) return []
      }
      return current.slice(prefix.length)
    }),
    push: (newPath, options) => {
      const fullPath = [...prefix, ...newPath]
      return router.push(fullPath, options)
    }
  }
}

export function useScopedRouterWithPathParam(pathParamName: string, pathParamGetter?: () => string | string[]): IScopedRouter {
  const router = useRouter()
  return makeScopedRouterWithPathParam(router, pathParamName, pathParamGetter)
}
