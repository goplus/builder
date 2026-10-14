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

/**
 * Split a slash-separated path into non-empty segments without URL decoding. For Vue Router parameters, use
 * `repeatableParamToPathSegments` instead so a decoded segment containing `/` stays intact.
 */
export function path2PathSegments(path: string): PathSegments {
  return path.split('/').filter((segment) => segment !== '')
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

/** Controls how a scoped navigation updates history. */
export type ScopedPushOptions = {
  /** Replace the current history entry instead of adding one. Defaults to false. */
  replace?: boolean
}

/**
 * Navigation within a component's own route space. Both `currentPath` and paths passed to `push` are relative to
 * that space; the host maps them to its routing structure without exposing route records or parameter names.
 *
 * Useful for reusable navigable components embedded in different pages, such as an editor hosted in a standalone
 * page or a course preview. The component can synchronize its state with navigation without knowing its host URL.
 * A host adapter can preserve deep links, browser history and surrounding route state while changing only this path.
 *
 * A scope may be backed by a route parameter, a child path prefix or local state; the interface does not require a
 * particular backing router. Prefix matching and inactive-navigation behavior belong to the specific adapter.
 */
export interface IScopedRouter {
  /** The current URL-decoded path segments, relative to this scope. */
  currentPath: Ref<PathSegments>
  /** Navigate to URL-decoded path segments relative to this scope. */
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

/**
 * Create a child scope by removing a fixed prefix from the parent's path and prepending it on navigation.
 * Outside that prefix, `currentPath` is empty and `push` does nothing; entering the child scope requires parent navigation.
 */
export function makeChildScopedRouter(router: IScopedRouter, prefix: PathSegments): IScopedRouter {
  const isActive = computed(() => prefix.every((segment, i) => router.currentPath.value[i] === segment))
  return {
    currentPath: computed(() => (isActive.value ? router.currentPath.value.slice(prefix.length) : [])),
    push: (newPath, options) => {
      if (!isActive.value) return Promise.resolve()
      return router.push([...prefix, ...newPath], options)
    }
  }
}

/**
 * Bind a scoped router to a repeatable path parameter of the current Vue Router route. Navigation updates only
 * that parameter, preserving the other parameters, query and hash; `replace` controls whether to add a history entry.
 */
export function useScopedRouterWithPathParam(
  pathParamName: string,
  /**
   * Defaults to reading the current route parameter. For a page using `props: true`, pass a getter such as
   * `() => props.inEditorPath` to update the path together with the component's other inputs. Route parameters
   * can update before those props; reading from props avoids the old component state reacting to a new path
   * before its other inputs have caught up.
   */
  pathParamGetter?: () => string | string[]
): IScopedRouter {
  const router = useRouter()
  return makeScopedRouterWithPathParam(router, pathParamName, pathParamGetter)
}
