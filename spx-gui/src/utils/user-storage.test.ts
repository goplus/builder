import { enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUserLocalStorage, useUserSessionStorage } from './user-storage'

let username = ref<string | null>('alice')
vi.mock('@/stores/user', () => ({
  useSignedIn: () => ({
    get username() {
      return username.value
    }
  })
}))
enableAutoUnmount(afterEach)

function setup<T>(useValue: () => T): T {
  let value!: T
  mount(
    defineComponent({
      setup() {
        value = useValue()
        return () => null
      }
    })
  )
  return value
}

beforeEach(() => {
  username = ref('alice')
  localStorage.clear()
  sessionStorage.clear()
})

describe.each([
  ['local', useUserLocalStorage, localStorage],
  ['session', useUserSessionStorage, sessionStorage]
] as const)('%s storage scoped to the current user', (_name, useStorage, storage) => {
  it('restores preferences without writing an initialization default', () => {
    const saved = JSON.stringify({ __user__: 'alice', __value__: 18 })
    storage.setItem('size', saved)
    const size = setup(() => useStorage('size', 12))
    expect(size.value).toBe(18)
    expect(storage.getItem('size')).toBe(saved)
  })

  it('lets a signed-in user inherit guest data and scopes subsequent writes', () => {
    username.value = null
    const size = setup(() => useStorage('size', 12))
    size.value = 16
    username.value = 'alice'
    expect(size.value).toBe(16)
    size.value = 18
    expect(JSON.parse(storage.getItem('size')!)).toEqual({ __user__: 'alice', __value__: 18 })
  })

  it.each([null, 'bob'])('isolates the old account value when switching to %s', (nextUsername) => {
    const size = setup(() => useStorage('size', 12))
    size.value = 18
    username.value = nextUsername
    expect(size.value).toBe(12)
    size.value = 20
    expect(JSON.parse(storage.getItem('size')!)).toEqual({
      __user__: nextUsername ?? '__guest__',
      __value__: 20
    })
  })

  it('writes under the current identity even before reading after a switch', () => {
    const size = setup(() => useStorage('size', 12))
    size.value = 18
    username.value = 'bob'
    size.value = 20
    expect(JSON.parse(storage.getItem('size')!)).toEqual({ __user__: 'bob', __value__: 20 })
    expect(size.value).toBe(20)
    username.value = 'alice'
    expect(size.value).toBe(12)
  })

  it('supports nullable values and clears the record on reset', () => {
    const course = setup(() => useStorage<{ id: string } | null>('course', null))
    expect(course.value).toBeNull()
    course.value = { id: 'first' }
    expect(JSON.parse(storage.getItem('course')!).__value__).toEqual({ id: 'first' })
    username.value = 'bob'
    expect(course.value).toBeNull()
    course.value = { id: 'second' }
    course.value = null
    expect(storage.getItem('course')).toBeNull()
  })

  it('continues to read legacy unscoped values', () => {
    storage.setItem('size', JSON.stringify(18))
    expect(setup(() => useStorage('size', 12)).value).toBe(18)
    expect(storage.getItem('size')).toBe('18')
  })
})
