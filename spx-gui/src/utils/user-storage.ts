import { getSignedInUsername } from '@/stores/user'
import { computed, shallowReactive } from 'vue'

type IStorage<T> = {
  get(key: string): T | null
  set(key: string, value: T): void
  remove(key: string): void
  keys(): string[]
}

function implIStorage(storage: Storage): IStorage<any> {
  return {
    get<T>(key: string): T | null {
      const item = storage.getItem(key)
      return item == null ? null : JSON.parse(item)
    },
    set<T>(key: string, value: T) {
      storage.setItem(key, JSON.stringify(value))
    },
    remove(key: string) {
      storage.removeItem(key)
    },
    keys() {
      const keysToDelete: string[] = []
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key != null) {
          keysToDelete.push(key)
        }
      }
      return keysToDelete
    }
  }
}

const local = implIStorage(localStorage)
const session = implIStorage(sessionStorage)
// Unique prefix to identify user-scoped storage keys
const prefix = '__D7p9D__'
// Default scope for non-authenticated users
const defaultScope = '__G&PW8H7fKv__'

const lsSyncer = shallowReactive(new Map<string, number>())
function watchLSChange(key: string) {
  lsSyncer.get(key)
}
function fireLSChange(key: string) {
  const val = lsSyncer.get(key) ?? 0
  lsSyncer.set(key, val + 1)
}

function getScopeKey(scope: string, key: string) {
  return `${prefix}:${encodeURIComponent(scope)}:${key}`
}

// private
// refer from: spx-gui/src/utils/utils.ts#localStorageRef
function useUserStorageRef<T>(key: string, initialValue: T, storage: IStorage<T> = local) {
  const scope = computed(() => getSignedInUsername() ?? defaultScope)
  return computed<T>({
    get() {
      const scopeKey = getScopeKey(scope.value, key)
      watchLSChange(scopeKey)
      let value = storage.get(scopeKey)
      if (value == null) {
        // TODO: Fallback to global key for backward compatibility
        value = storage.get(key)
        if (value != null) {
          storage.set(scopeKey, value)
          storage.remove(key)
        }
      }
      return value == null ? initialValue : value
    },
    set(newValue) {
      const scopeKey = getScopeKey(scope.value, key)
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

export function clearAllUserStorage() {
  ;[local, session].forEach((storage) => {
    storage.keys().forEach((key) => {
      if (key.startsWith(prefix)) {
        storage.remove(key)
      }
    })
  })
}
