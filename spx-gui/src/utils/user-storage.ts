import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'
import { isObject, isString } from 'lodash'

type IStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

type UserScopeValue<T> = {
  [userKey]: string
  [valueKey]: T
}

const userKey = '__user__'
const valueKey = '__value__'
// Scope for unauthorized users
const unauthorized = '__guest__'

function isUserScopeValue<T>(obj: any): obj is UserScopeValue<T> {
  return obj != null && isObject(obj) && userKey in obj && isString(obj[userKey]) && valueKey in obj
}

function createUserScopeValue<T>(user: string, value: T): UserScopeValue<T> {
  return {
    [userKey]: user,
    [valueKey]: value
  }
}

/**
 * Resolved value of a user/session storage scope.
 *
 * Scope semantics:
 * - `string`: resolved signed-in scope
 * - `null`: resolved guest scope
 * - `undefined`: scope not resolved yet
 */
export type UserStorageScopeValue = string | null | undefined

/**
 * Synchronous user/session scope used to isolate stored values.
 *
 * Callers must provide this explicitly instead of letting the storage utility derive it from auth
 * state. That keeps this utility generic and avoids coupling it to any particular signed-in-user
 * caching strategy.
 */
export type UserStorageScope = MaybeRefOrGetter<UserStorageScopeValue>

// private
function userStorageRef<T>(key: string, initialValue: T, scope: UserStorageScope, storage: IStorage = localStorage) {
  // User-scoped storage must stay synchronously readable, so callers need to pass a scope that is
  // already available locally.
  //
  // While scope is still `undefined`, this helper avoids reading or writing storage so startup
  // windows do not accidentally use the wrong bucket before the real scope is known.
  const normalizedScope = computed<string | undefined>(() => {
    const currentScope = toValue(scope) as UserStorageScopeValue
    if (currentScope === undefined) return undefined
    return currentScope ?? unauthorized
  })
  const counter = ref(0)
  return computed<T>({
    get() {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      counter.value
      const currentScope = normalizedScope.value
      if (currentScope === undefined) return initialValue
      const exportedValue = storage.getItem(key)
      if (exportedValue == null) {
        return initialValue
      }
      const parsedValue = JSON.parse(exportedValue)
      const { [userKey]: user, [valueKey]: scopeValue } = isUserScopeValue<T>(parsedValue)
        ? parsedValue
        : // Legacy data compatibility: Old data without user scope is treated as shared/public until
          // a user writes to it. When reading legacy data, we bind it to the current user without
          // persisting (no setItem here), so it remains accessible to all users until someone writes.
          createUserScopeValue(currentScope, parsedValue)
      let value = scopeValue
      // The value of 'unauthorized' can be inherited, but not vice versa.
      if (user !== currentScope && user !== unauthorized) {
        storage.removeItem(key)
        value = null
      }
      return value == null ? initialValue : value
    },
    set(newValue) {
      const currentScope = normalizedScope.value
      if (currentScope === undefined) return
      if (newValue === initialValue) {
        storage.removeItem(key)
      } else {
        storage.setItem(key, JSON.stringify(createUserScopeValue(currentScope, newValue)))
      }
      counter.value++
    }
  })
}

export function userLocalStorageRef<T>(key: string, initialValue: T, scope: UserStorageScope) {
  return userStorageRef<T>(key, initialValue, scope, localStorage)
}

export function userSessionStorageRef<T>(key: string, initialValue: T, scope: UserStorageScope) {
  return userStorageRef<T>(key, initialValue, scope, sessionStorage)
}
