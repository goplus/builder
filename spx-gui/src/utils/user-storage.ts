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

// private
function userStorageRef<T>(key: string, initialValue: T, storage: IStorage = localStorage) {
  const scope = computed(() => getSignedInUsername() ?? unauthorized)
  const counter = ref(0)
  return computed<T>({
    get() {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
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
      if (newValue === initialValue) {
        storage.removeItem(key)
      } else {
        storage.setItem(key, JSON.stringify(createUserScopeValue(scope.value, newValue)))
      }
      counter.value++
    }
  })
}

export function userLocalStorageRef<T>(key: string, initialValue: T) {
  return userStorageRef<T>(key, initialValue, localStorage)
}

export function userSessionStorageRef<T>(key: string, initialValue: T) {
  return userStorageRef<T>(key, initialValue, sessionStorage)
}
