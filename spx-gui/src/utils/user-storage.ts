import { computed, ref } from 'vue'
import { getSignedInUsername } from '@/stores/user'
import { isObject, isString } from 'lodash'

type IStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

type UserScopeValue<T> = {
  user: string
  value: T
}

function isUserScopeValue<T>(obj: any): obj is UserScopeValue<T> {
  return obj != null && isObject(obj) && 'user' in obj && isString(obj.user) && 'value' in obj
}

// Default scope for non-authenticated users
const defaultScope = '__G&PW8H7fKv__'

// private
function useUserStorageRef<T>(key: string, initialValue: T, storage: IStorage = localStorage) {
  const scope = computed(() => getSignedInUsername() ?? defaultScope)
  const syncer = ref(0)
  return computed<T>({
    get() {
      syncer.value
      const currentScope = scope.value
      const exportedValue = storage.getItem(key)
      if (exportedValue == null) {
        return initialValue
      }
      const parsedValue = JSON.parse(exportedValue)
      const { user, value: scopeValue } = isUserScopeValue<T>(parsedValue)
        ? parsedValue
        : // Legacy data compatibility: Old data without user scope is treated as shared/public until
          // a user writes to it. When reading legacy data, we bind it to the current user without
          // persisting (no setItem here), so it remains accessible to all users until someone writes.
          { user: currentScope, value: parsedValue }
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
          user: scope.value,
          value: newValue
        }
        storage.setItem(key, JSON.stringify(userScopeValue))
      }
      syncer.value++
    }
  })
}

export function useUserLocalStorageRef<T>(key: string, initialValue: T) {
  return useUserStorageRef<T>(key, initialValue, localStorage)
}

export function useUserSessionStorageRef<T>(key: string, initialValue: T) {
  return useUserStorageRef<T>(key, initialValue, sessionStorage)
}
