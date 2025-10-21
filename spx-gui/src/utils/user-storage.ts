import { getSignedInUsername } from '@/stores/user'
import { computed, shallowReactive } from 'vue'

type IStorage<T> = {
  get(key: string): T | null
  set(key: string, value: T): void
  remove(key: string): void
  has(key: string): boolean
}

const local = {
  get<T>(key: string): T | null {
    const item = localStorage.getItem(key)
    return item == null ? null : JSON.parse(item)
  },
  set<T>(key: string, value: T) {
    localStorage.setItem(key, JSON.stringify(value))
  },
  remove(key: string) {
    localStorage.removeItem(key)
  },
  has(key: string) {
    return localStorage.getItem(key) != null
  }
}

const session = {
  get<T>(key: string): T | null {
    const item = sessionStorage.getItem(key)
    return item == null ? null : JSON.parse(item)
  },
  set<T>(key: string, value: T) {
    sessionStorage.setItem(key, JSON.stringify(value))
  },
  remove(key: string) {
    sessionStorage.removeItem(key)
  },
  has(key: string) {
    return sessionStorage.getItem(key) != null
  }
}

const lsSyncer = shallowReactive(new Map<string, number>())
function watchLSChange(key: string) {
  lsSyncer.get(key)
}
function fireLSChange(key: string) {
  const val = lsSyncer.get(key) ?? 0
  lsSyncer.set(key, val + 1)
}

function getScopeKey(scope: string, key: string) {
  return `${scope}/${key}`
}

// refer from: spx-gui/src/utils/utils.ts#localStorageRef
function useUserStorageRef<T>(key: string, initialValue: T, storage: IStorage<T> = local) {
  return computed<T>({
    get() {
      const scope = getSignedInUsername()
      if (scope == null) {
        return initialValue
      }
      const scopeKey = getScopeKey(scope, key)
      watchLSChange(scopeKey)
      let value = storage.get(scopeKey)
      if (value == null) {
        // TODO: Fallback to global key for backward compatibility
        value = storage.get(key)
      }
      return value == null ? initialValue : value
    },
    set(newValue) {
      const scope = getSignedInUsername()
      if (scope == null) {
        return
      }
      const scopeKey = getScopeKey(scope, key)
      if (newValue === initialValue) {
        storage.remove(scopeKey)
      } else {
        storage.set(scopeKey, newValue)
      }
      fireLSChange(scopeKey)
    }
  })
}

export function useUserLocalStorageRef<T>(key: string, initialValue: T) {
  return useUserStorageRef<T>(key, initialValue, local)
}

export function useUserSessionStorageRef<T>(key: string, initialValue: T) {
  return useUserStorageRef<T>(key, initialValue, session)
}
