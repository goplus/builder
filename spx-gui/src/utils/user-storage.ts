import { computed, ref } from 'vue'
import { getSignedInUsername } from '@/stores/user'
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
// Default scope for non-authenticated users
const defaultScope = '__guest__'

function isUserScopeValue<T>(obj: any): obj is UserScopeValue<T> {
  return obj != null && isObject(obj) && userKey in obj && isString(obj[userKey]) && valueKey in obj
}

// private
function useUserStorageRef<T>(key: string, initialValue: T, storage: IStorage = localStorage) {
  const scope = computed(() => getSignedInUsername() ?? defaultScope)
  const counter = ref(0)
  return computed<T>({
    get() {
      counter.value
      const currentScope = scope.value
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
          { [userKey]: currentScope, [valueKey]: parsedValue }
      let value = scopeValue
      if (user !== currentScope) {
        storage.removeItem(key)
        value = null
      }
      return value == null ? initialValue : value
    },
    set(newValue) {
      if (newValue === initialValue) {
        storage.removeItem(key)
      } else {
        const userScopeValue: UserScopeValue<T> = {
          [userKey]: scope.value,
          [valueKey]: newValue
        }
        storage.setItem(key, JSON.stringify(userScopeValue))
      }
      counter.value++
    }
  })
}

export function useUserLocalStorageRef<T>(key: string, initialValue: T) {
  return useUserStorageRef<T>(key, initialValue, localStorage)
}

export function useUserSessionStorageRef<T>(key: string, initialValue: T) {
  return useUserStorageRef<T>(key, initialValue, sessionStorage)
}
